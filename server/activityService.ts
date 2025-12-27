import { db } from './db';
import { auditLogs, users } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { getResendClient } from './emailService';

// Activity types for consistent logging
export type ActivityType = 
  | 'contract_sent'
  | 'contract_signed'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_confirmed'
  | 'inquiry_received'
  | 'inquiry_responded'
  | 'message_sent'
  | 'schedule_created'
  | 'schedule_shared'
  | 'profile_updated';

// Resource types
export type ResourceType = 
  | 'contract'
  | 'invoice'
  | 'booking'
  | 'inquiry'
  | 'message'
  | 'schedule'
  | 'profile'
  | 'user';

interface LogActivityParams {
  userId: string;
  actorRole?: string;
  action: ActivityType;
  resourceType: ResourceType;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
  ipAddress?: string;
}

// Human-readable action names for emails
const actionLabels: Record<ActivityType, string> = {
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  invoice_created: 'Invoice Created',
  invoice_sent: 'Invoice Sent',
  invoice_paid: 'Invoice Paid',
  booking_created: 'New Booking Created',
  booking_updated: 'Booking Updated',
  booking_confirmed: 'Booking Confirmed',
  inquiry_received: 'New Inquiry Received',
  inquiry_responded: 'Inquiry Responded',
  message_sent: 'Message Sent',
  schedule_created: 'Schedule Created',
  schedule_shared: 'Schedule Shared',
  profile_updated: 'Profile Updated',
};

// Log activity and optionally send email notification
export async function logActivity(params: LogActivityParams): Promise<string> {
  const {
    userId,
    actorRole = 'artist',
    action,
    resourceType,
    resourceId,
    description,
    metadata = {},
    sendEmail = true,
    ipAddress,
  } = params;

  let emailSent = false;
  let emailSentTo: string | null = null;

  // Get user email for notification
  let userEmail: string | null = null;
  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length > 0 && user[0].email) {
      userEmail = user[0].email;
    }
  } catch (err) {
    console.error('[ActivityService] Error fetching user:', err);
  }

  // Send email notification if enabled and user has email
  if (sendEmail && userEmail) {
    try {
      await sendActivityNotificationEmail({
        toEmail: userEmail,
        action,
        description,
        metadata,
      });
      emailSent = true;
      emailSentTo = userEmail;
      console.log(`[ActivityService] Email notification sent to ${userEmail} for ${action}`);
    } catch (err) {
      console.error('[ActivityService] Failed to send email notification:', err);
    }
  }

  // Log to database
  const [log] = await db.insert(auditLogs).values({
    userId,
    actorRole,
    action,
    resourceType,
    resourceId,
    description,
    emailSent,
    emailSentTo,
    metadata,
    ipAddress,
  }).returning({ id: auditLogs.id });

  console.log(`[ActivityService] Logged activity: ${action} for user ${userId}`);
  return log.id;
}

// Send activity notification email
async function sendActivityNotificationEmail({
  toEmail,
  action,
  description,
  metadata,
}: {
  toEmail: string;
  action: ActivityType;
  description: string;
  metadata: Record<string, any>;
}) {
  const { client, fromEmail } = await getResendClient();
  
  const actionLabel = actionLabels[action] || action;
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #6B4A55;
          padding: 24px; 
          text-align: center;
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 24px; margin: 0; font-weight: normal; color: white; }
        .content { padding: 32px; }
        .action-badge {
          display: inline-block;
          background-color: #FAF7F2;
          color: #6B4A55;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .description { font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px; }
        .timestamp { font-size: 12px; color: #888; margin-top: 16px; }
        .footer { padding: 20px 32px; background-color: #FAF7F2; text-align: center; border-top: 1px solid #e5e8f2; }
        .footer p { margin: 0; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Activity Update</h1>
        </div>
        <div class="content">
          <div class="action-badge">✓ ${actionLabel}</div>
          <p class="description">${description}</p>
          ${metadata.clientName ? `<p style="font-size: 14px; color: #666;"><strong>Client:</strong> ${metadata.clientName}</p>` : ''}
          ${metadata.amount ? `<p style="font-size: 14px; color: #666;"><strong>Amount:</strong> $${(metadata.amount / 100).toFixed(2)}</p>` : ''}
          <p class="timestamp">${timestamp}</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your dashboard.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await client.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject: `✓ ${actionLabel}`,
    html: htmlContent,
  });
}

// Get recent activity for a user
export async function getRecentActivity(userId: string, limit: number = 20): Promise<any[]> {
  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    description: log.description,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    emailSent: log.emailSent,
    createdAt: log.createdAt,
    metadata: log.metadata,
  }));
}

// Get today's activity for a user
export async function getTodayActivity(userId: string): Promise<any[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        gte(auditLogs.createdAt, today)
      )
    )
    .orderBy(desc(auditLogs.createdAt));

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    description: log.description,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    emailSent: log.emailSent,
    createdAt: log.createdAt,
    metadata: log.metadata,
  }));
}
