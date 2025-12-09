import { storage } from './storage';
import { sendInvoiceEmail } from './emailService';

let isRunning = false;

async function processScheduledEmails() {
  if (isRunning) return;
  isRunning = true;
  
  try {
    const pendingEmails = await storage.getPendingScheduledEmails();
    
    if (pendingEmails.length > 0) {
      console.log(`[ScheduledEmails] Processing ${pendingEmails.length} pending email(s)`);
    }
    
    for (const scheduledEmail of pendingEmails) {
      try {
        console.log(`[ScheduledEmails] Sending ${scheduledEmail.emailType} to ${scheduledEmail.recipientEmail}`);
        
        if (scheduledEmail.emailType === 'invoice') {
          const emailData = scheduledEmail.emailData as {
            vendorName?: string;
            amount?: number;
            description?: string;
            paymentLink?: string;
          } | null;
          
          if (!emailData?.paymentLink) {
            console.error(`[ScheduledEmails] No payment link for email ${scheduledEmail.id}`);
            await storage.markScheduledEmailFailed(scheduledEmail.id, 'No payment link provided');
            continue;
          }
          
          await sendInvoiceEmail({
            toEmail: scheduledEmail.recipientEmail,
            clientName: scheduledEmail.recipientName,
            vendorName: emailData.vendorName || 'Your Vendor',
            amount: emailData.amount || 0,
            description: emailData.description || 'Payment for services',
            paymentLink: emailData.paymentLink,
          });
          
          await storage.markScheduledEmailSent(scheduledEmail.id);
          console.log(`[ScheduledEmails] Successfully sent email ${scheduledEmail.id}`);
        } else {
          console.warn(`[ScheduledEmails] Unknown email type: ${scheduledEmail.emailType}`);
          await storage.markScheduledEmailFailed(scheduledEmail.id, `Unknown email type: ${scheduledEmail.emailType}`);
        }
      } catch (error: any) {
        console.error(`[ScheduledEmails] Error sending email ${scheduledEmail.id}:`, error.message);
        await storage.markScheduledEmailFailed(scheduledEmail.id, error.message);
      }
    }
  } catch (error: any) {
    console.error('[ScheduledEmails] Error in job:', error.message);
  } finally {
    isRunning = false;
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startScheduledEmailJob() {
  if (intervalId) {
    console.log('[ScheduledEmails] Job already running');
    return;
  }
  
  console.log('[ScheduledEmails] Starting job - checking every minute');
  
  processScheduledEmails();
  
  intervalId = setInterval(processScheduledEmails, 60 * 1000);
}

export function stopScheduledEmailJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[ScheduledEmails] Job stopped');
  }
}
