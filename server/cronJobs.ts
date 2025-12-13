import { storage } from "./storage";
import { InquiryStatusReasons, InquiryNextActions } from "@shared/schema";

const HOLD_DEFAULT_EXPIRY_HOURS = 48;
const SLA_VENDOR_FIRST_RESPONSE_HOURS = 24;
const SLA_VENDOR_CONFIRM_HOURS = 48;
const SLA_CLIENT_PAYMENT_HOURS = 72;
const SLA_CLIENT_REPLY_HOURS = 48;

export async function runHoldExpirerJob() {
  console.log("[Cron] Running hold-expirer job...");
  const now = new Date();
  
  try {
    const expiredHolds = await storage.getExpiredHolds(now);
    console.log(`[Cron] Found ${expiredHolds.length} expired holds`);
    
    for (const inquiry of expiredHolds) {
      try {
        const holdExpiresAt = inquiry.hold?.expiresAt 
          ? new Date(inquiry.hold.expiresAt) 
          : inquiry.holdExpiresAt;
        
        if (!holdExpiresAt || holdExpiresAt > now) continue;
        
        await storage.updateInquiry(inquiry.id, {
          status: 'pending',
          statusReason: InquiryStatusReasons.HOLD_EXPIRED,
          hold: null as any,
          holdPlacedAt: null,
          holdExpiresAt: null,
          holdOwnerId: null,
          holdReason: null,
          lastActionAt: now,
        } as any);
        
        await storage.createAuditLog({
          action: 'hold_expired',
          entityType: 'inquiry',
          entityId: inquiry.id,
          performedBy: 'system',
          actorRole: 'system' as any,
          diff: {
            status: { from: 'hold', to: 'pending' },
            statusReason: { from: inquiry.statusReason, to: InquiryStatusReasons.HOLD_EXPIRED },
            hold: { from: inquiry.hold, to: null },
          },
          changes: {
            expiredAt: now.toISOString(),
            holdWasPlacedAt: inquiry.hold?.placedAt || inquiry.holdPlacedAt?.toISOString(),
            holdOwnerId: inquiry.hold?.ownerId || inquiry.holdOwnerId,
          },
        });
        
        console.log(`[Cron] Expired hold for inquiry ${inquiry.id}`);
      } catch (err) {
        console.error(`[Cron] Error expiring hold for inquiry ${inquiry.id}:`, err);
      }
    }
    
    console.log("[Cron] Hold-expirer job completed");
  } catch (error) {
    console.error("[Cron] Hold-expirer job failed:", error);
  }
}

export async function runSlaEnforcerJob() {
  console.log("[Cron] Running SLA enforcer job...");
  const now = new Date();
  
  try {
    const activeInquiries = await storage.getActiveInquiries();
    console.log(`[Cron] Processing ${activeInquiries.length} active inquiries for SLA`);
    
    for (const inquiry of activeInquiries) {
      try {
        const updates: any = {};
        const breachFlags: string[] = [...(inquiry.breachFlags || [])];
        let shouldNotify = false;
        let notificationType: string | null = null;
        
        let computedNextAction: string | null = null;
        let computedNextActionDueAt: Date | null = null;
        
        switch (inquiry.status) {
          case 'pending':
            if (!inquiry.firstResponseAt) {
              computedNextAction = InquiryNextActions.VENDOR_FIRST_RESPONSE;
              computedNextActionDueAt = new Date(inquiry.createdAt.getTime() + SLA_VENDOR_FIRST_RESPONSE_HOURS * 60 * 60 * 1000);
              
              if (computedNextActionDueAt < now && !breachFlags.includes('first_response_sla')) {
                breachFlags.push('first_response_sla');
                shouldNotify = true;
                notificationType = 'vendor_alert';
              }
            } else {
              computedNextAction = InquiryNextActions.VENDOR_CONFIRM;
              computedNextActionDueAt = new Date(inquiry.firstResponseAt.getTime() + SLA_VENDOR_CONFIRM_HOURS * 60 * 60 * 1000);
            }
            break;
            
          case 'responded':
            computedNextAction = InquiryNextActions.CLIENT_REPLY;
            const lastAction = inquiry.lastActionAt || inquiry.firstResponseAt || inquiry.createdAt;
            computedNextActionDueAt = new Date(lastAction.getTime() + SLA_CLIENT_REPLY_HOURS * 60 * 60 * 1000);
            break;
            
          case 'hold':
            computedNextAction = InquiryNextActions.VENDOR_CONFIRM;
            const holdExpiry = inquiry.hold?.expiresAt 
              ? new Date(inquiry.hold.expiresAt)
              : inquiry.holdExpiresAt;
            computedNextActionDueAt = holdExpiry || null;
            break;
            
          case 'confirmed':
            if (inquiry.bookingId) {
              computedNextAction = InquiryNextActions.CLIENT_PAYMENT;
              const confirmedAt = inquiry.lastActionAt || inquiry.updatedAt || now;
              computedNextActionDueAt = new Date(confirmedAt.getTime() + SLA_CLIENT_PAYMENT_HOURS * 60 * 60 * 1000);
            }
            break;
        }
        
        if (computedNextAction !== inquiry.nextAction) {
          updates.nextAction = computedNextAction;
        }
        if (computedNextActionDueAt && (!inquiry.nextActionDueAt || 
            computedNextActionDueAt.getTime() !== inquiry.nextActionDueAt.getTime())) {
          updates.nextActionDueAt = computedNextActionDueAt;
        }
        if (JSON.stringify(breachFlags) !== JSON.stringify(inquiry.breachFlags)) {
          updates.breachFlags = breachFlags;
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateInquiry(inquiry.id, updates);
          
          const diff: Record<string, { from: any; to: any }> = {};
          if (updates.nextAction) {
            diff.nextAction = { from: inquiry.nextAction, to: updates.nextAction };
          }
          if (updates.nextActionDueAt) {
            diff.nextActionDueAt = { from: inquiry.nextActionDueAt?.toISOString() || null, to: updates.nextActionDueAt.toISOString() };
          }
          if (updates.breachFlags) {
            diff.breachFlags = { from: inquiry.breachFlags, to: updates.breachFlags };
          }
          
          await storage.createAuditLog({
            action: 'sla_computed',
            entityType: 'inquiry',
            entityId: inquiry.id,
            performedBy: 'system',
            actorRole: 'system' as any,
            diff,
            changes: {
              computedAt: now.toISOString(),
            },
          });
        }
        
        if (shouldNotify && notificationType) {
          await storage.createInquiryNotification({
            inquiryId: inquiry.id,
            type: notificationType,
            channel: 'email',
            actorSystem: 'cron_worker',
            recipientEmail: null,
            subject: `Action required: Inquiry from ${inquiry.clientName}`,
            content: `SLA breach detected. Next action: ${computedNextAction}`,
            status: 'pending',
          });
        }
        
      } catch (err) {
        console.error(`[Cron] Error processing SLA for inquiry ${inquiry.id}:`, err);
      }
    }
    
    console.log("[Cron] SLA enforcer job completed");
  } catch (error) {
    console.error("[Cron] SLA enforcer job failed:", error);
  }
}

export function startCronJobs() {
  console.log("[Cron] Starting cron job scheduler...");
  
  setInterval(async () => {
    await runHoldExpirerJob();
  }, 5 * 60 * 1000);
  
  setInterval(async () => {
    await runSlaEnforcerJob();
  }, 15 * 60 * 1000);
  
  setTimeout(async () => {
    await runHoldExpirerJob();
    await runSlaEnforcerJob();
  }, 10000);
  
  console.log("[Cron] Cron jobs scheduled: hold-expirer (5min), SLA-enforcer (15min)");
}
