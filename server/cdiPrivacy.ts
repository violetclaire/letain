/**
 * CDI Privacy & Security Module
 * 
 * Provides PII redaction, consent checking, and audit logging
 * for all CDI analysis operations.
 */

import { storage } from "./storage";

// ============= PII REDACTION =============

// Common PII patterns to redact before sending to AI
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  
  // Phone numbers (various formats)
  phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // Social Security Numbers
  ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
  
  // Credit card numbers
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  
  // Street addresses (simplified pattern)
  address: /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|place|pl|boulevard|blvd)\b/gi,
  
  // ZIP codes
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
};

// Replacement tokens
const REDACTION_TOKENS = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  ssn: '[SSN_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  address: '[ADDRESS_REDACTED]',
  zipCode: '[ZIP_REDACTED]',
  name: '[NAME_REDACTED]',
};

interface RedactionResult {
  redactedText: string;
  redactionsApplied: Array<{
    type: string;
    count: number;
  }>;
  originalLength: number;
  redactedLength: number;
}

/**
 * Redact PII from text before sending to AI analysis
 */
export function redactPII(text: string, knownNames?: string[]): RedactionResult {
  if (!text) {
    return {
      redactedText: '',
      redactionsApplied: [],
      originalLength: 0,
      redactedLength: 0,
    };
  }

  let redactedText = text;
  const redactionsApplied: Array<{ type: string; count: number }> = [];

  // Apply pattern-based redactions
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = redactedText.match(pattern);
    if (matches && matches.length > 0) {
      redactedText = redactedText.replace(pattern, REDACTION_TOKENS[type as keyof typeof REDACTION_TOKENS]);
      redactionsApplied.push({ type, count: matches.length });
    }
  }

  // Redact known names if provided
  if (knownNames && knownNames.length > 0) {
    let nameCount = 0;
    for (const name of knownNames) {
      if (name && name.length > 2) {
        const namePattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'gi');
        const matches = redactedText.match(namePattern);
        if (matches) {
          redactedText = redactedText.replace(namePattern, REDACTION_TOKENS.name);
          nameCount += matches.length;
        }
      }
    }
    if (nameCount > 0) {
      redactionsApplied.push({ type: 'name', count: nameCount });
    }
  }

  return {
    redactedText,
    redactionsApplied,
    originalLength: text.length,
    redactedLength: redactedText.length,
  };
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============= CONSENT CHECKING =============

interface ConsentStatus {
  hasConsent: boolean;
  isOptedOut: boolean;
  consentDate: Date | null;
  canProcess: boolean;
  reason?: string;
}

/**
 * Check if a user has given CDI consent and hasn't opted out
 */
export async function checkCDIConsent(userId: string): Promise<ConsentStatus> {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        hasConsent: false,
        isOptedOut: false,
        consentDate: null,
        canProcess: false,
        reason: 'User not found',
      };
    }

    const hasConsent = user.cdiConsentGiven === true;
    const isOptedOut = user.cdiOptOut === true;
    const consentDate = user.cdiConsentDate || null;

    return {
      hasConsent,
      isOptedOut,
      consentDate,
      canProcess: hasConsent && !isOptedOut,
      reason: isOptedOut 
        ? 'User has opted out of CDI analysis' 
        : !hasConsent 
          ? 'User has not given CDI consent' 
          : undefined,
    };
  } catch (error) {
    console.error('[CDI Privacy] Error checking consent:', error);
    return {
      hasConsent: false,
      isOptedOut: false,
      consentDate: null,
      canProcess: false,
      reason: 'Error checking consent status',
    };
  }
}

/**
 * Record that a user has given CDI consent
 */
export async function recordCDIConsent(userId: string): Promise<boolean> {
  try {
    await storage.updateUser(userId, {
      cdiConsentGiven: true,
      cdiConsentDate: new Date(),
      cdiOptOut: false,
    });
    
    await logCDIAuditEvent({
      userId,
      eventType: 'consent_given',
      details: { timestamp: new Date().toISOString() },
    });
    
    return true;
  } catch (error) {
    console.error('[CDI Privacy] Error recording consent:', error);
    return false;
  }
}

/**
 * Record that a user has opted out of CDI
 */
export async function recordCDIOptOut(userId: string): Promise<boolean> {
  try {
    await storage.updateUser(userId, {
      cdiOptOut: true,
    });
    
    await logCDIAuditEvent({
      userId,
      eventType: 'opt_out',
      details: { timestamp: new Date().toISOString() },
    });
    
    return true;
  } catch (error) {
    console.error('[CDI Privacy] Error recording opt-out:', error);
    return false;
  }
}

/**
 * Record that a user has opted back into CDI
 */
export async function recordCDIOptIn(userId: string): Promise<boolean> {
  try {
    await storage.updateUser(userId, {
      cdiOptOut: false,
    });
    
    await logCDIAuditEvent({
      userId,
      eventType: 'opt_in',
      details: { timestamp: new Date().toISOString() },
    });
    
    return true;
  } catch (error) {
    console.error('[CDI Privacy] Error recording opt-in:', error);
    return false;
  }
}

// ============= AUDIT LOGGING =============

interface CDIAuditEvent {
  userId: string;
  eventType: 'analysis_performed' | 'consent_given' | 'opt_out' | 'opt_in' | 'data_access' | 'redaction_applied';
  details: Record<string, any>;
  bookingId?: string;
  messageId?: string;
}

/**
 * Log a CDI audit event for compliance tracking
 */
export async function logCDIAuditEvent(event: CDIAuditEvent): Promise<void> {
  try {
    await storage.createAuditLog({
      action: `cdi_${event.eventType}`,
      entityType: 'cdi',
      entityId: event.userId,
      performedBy: 'system',
      changes: {
        ...event.details,
        bookingId: event.bookingId,
        messageId: event.messageId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[CDI Privacy] Error logging audit event:', error);
  }
}

/**
 * Wrapper function to safely process CDI analysis with consent checking and PII redaction
 */
export async function safeCDIProcess<T>(
  userId: string,
  text: string,
  processFn: (redactedText: string) => Promise<T>,
  options?: {
    knownNames?: string[];
    bookingId?: string;
    skipConsentCheck?: boolean;
  }
): Promise<{ result: T | null; blocked: boolean; reason?: string }> {
  // Check consent (unless skipped for admin operations)
  if (!options?.skipConsentCheck) {
    const consent = await checkCDIConsent(userId);
    if (!consent.canProcess) {
      return {
        result: null,
        blocked: true,
        reason: consent.reason,
      };
    }
  }

  // Redact PII
  const redaction = redactPII(text, options?.knownNames);

  // Log the analysis event
  await logCDIAuditEvent({
    userId,
    eventType: 'analysis_performed',
    bookingId: options?.bookingId,
    details: {
      originalLength: redaction.originalLength,
      redactedLength: redaction.redactedLength,
      redactionsApplied: redaction.redactionsApplied,
    },
  });

  // Perform the actual analysis with redacted text
  try {
    const result = await processFn(redaction.redactedText);
    return { result, blocked: false };
  } catch (error: any) {
    console.error('[CDI Privacy] Error in CDI processing:', error);
    return {
      result: null,
      blocked: true,
      reason: `Analysis error: ${error.message}`,
    };
  }
}

export default {
  redactPII,
  checkCDIConsent,
  recordCDIConsent,
  recordCDIOptOut,
  recordCDIOptIn,
  logCDIAuditEvent,
  safeCDIProcess,
};
