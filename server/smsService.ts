import twilio from 'twilio';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    console.warn('[SMS] Twilio not configured - missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER');
    return null;
  }

  return { accountSid, authToken, phoneNumber };
}

function getTwilioClient() {
  const config = getTwilioConfig();
  if (!config) {
    return null;
  }
  return twilio(config.accountSid, config.authToken);
}

export function isSmsConfigured(): boolean {
  return getTwilioConfig() !== null;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(
  to: string,
  body: string
): Promise<SendSmsResult> {
  const config = getTwilioConfig();
  if (!config) {
    return {
      success: false,
      error: 'SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
    };
  }

  const client = getTwilioClient();
  if (!client) {
    return {
      success: false,
      error: 'Failed to initialize Twilio client'
    };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    console.log(`[SMS] Sending message to ${normalizedPhone}`);
    
    const message = await client.messages.create({
      body,
      from: config.phoneNumber,
      to: normalizedPhone
    });

    console.log(`[SMS] Message sent successfully: ${message.sid}`);
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error: any) {
    console.error('[SMS] Failed to send message:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

export async function sendBulkSms(
  recipients: string[],
  body: string
): Promise<{ successful: number; failed: number; results: SendSmsResult[] }> {
  const results = await Promise.all(
    recipients.map(async (phone) => {
      return sendSms(phone, body);
    })
  );

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  return { successful, failed, results };
}

export async function sendBookingReminder(
  clientPhone: string,
  clientName: string,
  vendorName: string,
  serviceName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<SendSmsResult> {
  const message = `Hi ${clientName}! This is a reminder about your upcoming ${serviceName} appointment with ${vendorName} on ${appointmentDate} at ${appointmentTime}. Reply CONFIRM to confirm or call us if you need to reschedule.`;
  
  return sendSms(clientPhone, message);
}

export async function sendBookingConfirmation(
  clientPhone: string,
  clientName: string,
  vendorName: string,
  serviceName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<SendSmsResult> {
  const message = `Hi ${clientName}! Your ${serviceName} appointment with ${vendorName} is confirmed for ${appointmentDate} at ${appointmentTime}. We look forward to seeing you!`;
  
  return sendSms(clientPhone, message);
}

export async function sendPaymentReminder(
  clientPhone: string,
  clientName: string,
  vendorName: string,
  amount: number,
  dueDate: string
): Promise<SendSmsResult> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
  
  const message = `Hi ${clientName}! This is a friendly reminder that your payment of ${formattedAmount} to ${vendorName} is due on ${dueDate}. Please complete your payment via the link sent to your email.`;
  
  return sendSms(clientPhone, message);
}

export async function sendScheduleNotification(
  recipientPhone: string,
  senderName: string,
  eventName: string,
  scheduleLink: string
): Promise<SendSmsResult> {
  const message = `${senderName} has shared a schedule with you for "${eventName}". View it here: ${scheduleLink}`;
  
  return sendSms(recipientPhone, message);
}

export async function sendCustomNotification(
  phone: string,
  message: string
): Promise<SendSmsResult> {
  const fullMessage = message;
  return sendSms(phone, fullMessage);
}

function normalizePhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      return cleaned;
    }
    return null;
  }
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  return null;
}
