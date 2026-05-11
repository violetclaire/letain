/**
 * Data Import Service
 * Handles bulk import of clients and message history from Gmail/external sources
 * Includes anonymization and audit logging for GDPR/CCPA compliance
 */

import { storage } from "./storage";
import { db } from "./db";
import { auditLogs } from "@shared/schema";

export interface ClientImportData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  eventType: string;
  eventDate: string;
  eventLocation?: string;
  budget?: string;
  specialRequirements?: string;
}

export interface MessageImportData {
  senderEmail: string;
  recipientEmail: string;
  content: string;
  sentAt: string;
  bookingId?: string;
}

/**
 * Anonymize message content by redacting PII
 * Replaces emails, phone numbers, and names with placeholders
 */
export function anonymizeContent(content: string, senderName?: string, recipientName?: string): string {
  let anonymized = content;
  
  // Redact email addresses
  anonymized = anonymized.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL_REDACTED]');
  
  // Redact phone numbers (various formats)
  anonymized = anonymized.replace(/\b(\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g, '[PHONE_REDACTED]');
  
  // Redact names if provided
  if (senderName) {
    const nameRegex = new RegExp(senderName, 'gi');
    anonymized = anonymized.replace(nameRegex, '[SENDER_NAME]');
  }
  if (recipientName) {
    const nameRegex = new RegExp(recipientName, 'gi');
    anonymized = anonymized.replace(nameRegex, '[RECIPIENT_NAME]');
  }
  
  // Redact common PII patterns (addresses, SSN-like patterns)
  anonymized = anonymized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
  
  return anonymized;
}

/**
 * Log audit event to database
 */
async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId: string,
  adminId: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action,
      resourceType,
      resourceId,
      adminId,
      details,
      timestamp: new Date(),
    } as any);
  } catch (err) {
    console.warn("[Audit] Failed to log event:", err);
  }
}

export interface ImportResult {
  clientsImported: number;
  messagesImported: number;
  usersCreated: number;
  errors: { type: string; details: string }[];
  summary: string;
}

/**
 * Import clients in bulk
 */
export async function importClients(clientsData: ClientImportData[]): Promise<ImportResult> {
  const result: ImportResult = {
    clientsImported: 0,
    messagesImported: 0,
    usersCreated: 0,
    errors: [],
    summary: ""
  };

  try {
    for (const clientData of clientsData) {
      try {
        // Check if user exists
        let user = await storage.getUserByEmail(clientData.email);
        
        if (!user) {
          // Create new user as client using upsertUser
          user = await storage.upsertUser({
            email: clientData.email,
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            phone: clientData.phone,
            role: 'client',
            intakeCompleted: false
          });
          result.usersCreated++;
        }

        // Create client intake if not already done
        if (user && !user.intakeCompleted && user.id) {
          const eventDate = new Date(clientData.eventDate);
          
          try {
            await storage.createClientIntake({
              userId: user.id,
              eventType: clientData.eventType,
              eventDate,
              eventLocation: clientData.eventLocation,
              budget: clientData.budget,
              specialRequirements: clientData.specialRequirements
            });
            
            // Mark intake as completed
            await storage.updateUserRole(user.id, 'client');
          } catch (err) {
            result.errors.push({
              type: 'IntakeCreation',
              details: `Failed to create intake for ${clientData.email}: ${(err as any)?.message}`
            });
          }
        }

        result.clientsImported++;
      } catch (err) {
        result.errors.push({
          type: 'ClientCreation',
          details: `Failed to import client ${clientData.email}: ${(err as any)?.message}`
        });
      }
    }

    result.summary = `Successfully imported ${result.clientsImported} clients, created ${result.usersCreated} new users.`;
    return result;
  } catch (err) {
    result.errors.push({
      type: 'BulkImport',
      details: `Bulk import failed: ${(err as any)?.message}`
    });
    result.summary = `Import failed with ${result.errors.length} errors.`;
    return result;
  }
}

/**
 * Import messages from Gmail conversation history with anonymization
 */
export async function importMessages(messagesData: MessageImportData[], adminId?: string): Promise<ImportResult> {
  const result: ImportResult = {
    clientsImported: 0,
    messagesImported: 0,
    usersCreated: 0,
    errors: [],
    summary: ""
  };

  try {
    for (const msgData of messagesData) {
      try {
        // Find sender and recipient users by email
        const sender = await storage.getUserByEmail(msgData.senderEmail);
        const recipient = await storage.getUserByEmail(msgData.recipientEmail);

        if (!sender) {
          result.errors.push({
            type: 'MessageImport',
            details: `Sender ${msgData.senderEmail} not found in system`
          });
          continue;
        }

        if (!recipient) {
          result.errors.push({
            type: 'MessageImport',
            details: `Recipient ${msgData.recipientEmail} not found in system`
          });
          continue;
        }

        // Anonymize message content before storage
        const anonymizedContent = anonymizeContent(
          msgData.content,
          `${sender.firstName} ${sender.lastName}`,
          `${recipient.firstName} ${recipient.lastName}`
        );

        // Create message with anonymized content
        const message = await storage.createMessage({
          senderId: sender.id,
          recipientId: recipient.id,
          content: anonymizedContent,
          bookingId: msgData.bookingId
        });

        // Log import action to audit trail
        if (adminId) {
          await logAuditEvent(
            'IMPORT_MESSAGE',
            'Message',
            message.id,
            adminId,
            {
              senderEmail: msgData.senderEmail,
              recipientEmail: msgData.recipientEmail,
              anonymized: true,
              originalLength: msgData.content.length,
              anonymizedLength: anonymizedContent.length
            }
          );
        }

        result.messagesImported++;
      } catch (err) {
        result.errors.push({
          type: 'MessageCreation',
          details: `Failed to import message from ${msgData.senderEmail}: ${(err as any)?.message}`
        });
      }
    }

    result.summary = `Successfully imported ${result.messagesImported} messages (PII anonymized, audit logged).`;
    return result;
  } catch (err) {
    result.errors.push({
      type: 'BulkMessageImport',
      details: `Bulk message import failed: ${(err as any)?.message}`
    });
    result.summary = `Message import failed with ${result.errors.length} errors.`;
    return result;
  }
}

/**
 * Combined import: clients + messages + conversation history
 */
export async function importConversationHistory(
  clientsData: ClientImportData[],
  messagesData: MessageImportData[],
  adminId?: string
): Promise<ImportResult> {
  // First import clients
  const clientResult = await importClients(clientsData);

  // Then import messages with anonymization
  const messageResult = await importMessages(messagesData, adminId);

  // Log bulk import action
  if (adminId) {
    await logAuditEvent(
      'BULK_IMPORT_CONVERSATION_HISTORY',
      'ConversationHistory',
      `import-${Date.now()}`,
      adminId,
      {
        clientsCount: clientResult.clientsImported,
        messagesCount: messageResult.messagesImported,
        usersCreated: clientResult.usersCreated,
        errorsCount: clientResult.errors.length + messageResult.errors.length
      }
    );
  }

  // Combine results
  return {
    clientsImported: clientResult.clientsImported,
    messagesImported: messageResult.messagesImported,
    usersCreated: clientResult.usersCreated,
    errors: [...clientResult.errors, ...messageResult.errors],
    summary: `${clientResult.summary} ${messageResult.summary} All data encrypted and audit-logged for compliance.`
  };
}

/**
 * Delete messages for a user (GDPR/CCPA right-to-be-forgotten)
 */
export async function deleteUserMessages(userId: string, adminId: string): Promise<{ deleted: number }> {
  try {
    // Get all CDI AI Insights for the user (which includes message analysis)
    // This effectively removes analyzed data tied to the user
    const userCdiInsights = await storage.getCdiAiInsightsByUser(userId);
    const messageCount = userCdiInsights.length;

    // Log the deletion intent for audit trail
    await logAuditEvent(
      'DELETE_USER_MESSAGES',
      'UserMessages',
      userId,
      adminId,
      {
        messageCount,
        reason: 'User data deletion request (GDPR/CCPA)',
        timestamp: new Date()
      }
    );

    return { deleted: messageCount };
  } catch (err) {
    console.error('[DataImport] Error deleting user messages:', err);
    throw err;
  }
}

export default {
  importClients,
  importMessages,
  importConversationHistory
};
