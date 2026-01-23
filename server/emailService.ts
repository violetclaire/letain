import { Resend } from 'resend';

let connectionSettings: any;

// Get the base URL for email links - always use production URL for client-facing links
function getBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
}

// White-label email sender
const WHITELABEL_EMAIL_DOMAIN = 'dateinquiry.com';
const WHITELABEL_FROM_EMAIL = 'notifications@dateinquiry.com';

function sanitizeSenderName(name: string): string {
  return name
    .replace(/[<>"'\r\n\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeSubject(subject: string): string {
  return subject
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

async function getCredentials() {
  console.log("=== Getting Resend credentials ===");
  
  // Try Replit connector first (works in both dev and production deployments)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (hostname && xReplitToken) {
    try {
      console.log("Trying Replit connector...");
      console.log("Token type:", xReplitToken.split(' ')[0]);
      
      const url = 'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend';
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      });
      
      const data = await response.json();
      console.log("Connectors response status:", response.status);
      
      connectionSettings = data.items?.[0];
      
      if (connectionSettings?.settings?.api_key) {
        console.log("Using Resend from Replit connector");
        console.log("Got Resend API key (first 8 chars):", connectionSettings.settings.api_key?.substring(0, 8) + "...");
        // Use verified domain for emails
        return { 
          apiKey: connectionSettings.settings.api_key, 
          fromEmail: WHITELABEL_FROM_EMAIL 
        };
      }
    } catch (err) {
      console.log("Replit connector failed, trying fallback:", err);
    }
  }
  
  // Fall back to direct RESEND_API_KEY environment variable
  if (process.env.RESEND_API_KEY) {
    console.log("Using direct RESEND_API_KEY from environment");
    return { 
      apiKey: process.env.RESEND_API_KEY, 
      fromEmail: WHITELABEL_FROM_EMAIL 
    };
  }
  
  console.error("No Resend credentials available - neither connector nor RESEND_API_KEY found");
  throw new Error('No Resend credentials available');
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  cc
}: {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
}) {
  const { client, fromEmail } = await getResendClient();
  
  const safeSubject = sanitizeSubject(subject);
  
  // Filter valid CC emails
  const validCc = cc?.filter(email => email && email.includes('@')) || [];
  
  console.log(`[Email] Sending to: ${to}, cc: ${validCc.join(', ') || 'none'}, subject: ${safeSubject}`);
  
  const emailPayload: any = {
    from: `Date Inquiry <${fromEmail}>`,
    to: [to],
    subject: safeSubject,
    html
  };
  
  if (validCc.length > 0) {
    emailPayload.cc = validCc;
  }
  
  const result = await client.emails.send(emailPayload);
  
  console.log(`[Email] Send result:`, result);
  return result;
}

export async function sendScheduleEmail({
  toEmails,
  scheduleLink,
  eventName,
  eventDates,
  senderName,
  personalMessage
}: {
  toEmails: string[];
  scheduleLink: string;
  eventName: string;
  eventDates: string;
  senderName: string;
  personalMessage?: string;
}) {
  console.log("Getting Resend client...");
  const { client, fromEmail } = await getResendClient();
  console.log("Resend client ready, fromEmail:", fromEmail);

  const safeSenderName = escapeHtml(senderName);
  const safeEventName = escapeHtml(eventName);
  const safeEventDates = escapeHtml(eventDates);
  const safePersonalMessage = personalMessage ? escapeHtml(personalMessage) : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .content { padding: 32px; }
        .event-name { font-size: 20px; color: #6B4A55; margin-bottom: 8px; }
        .event-dates { color: #666; font-size: 14px; margin-bottom: 20px; }
        .message { background: #f5f1e8; padding: 16px; border-radius: 6px; margin-bottom: 24px; font-style: italic; color: #444; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; letter-spacing: 1px; }
        .button:hover { background: #8a6270; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${safeSenderName}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi there,</p>
          <p style="margin-bottom: 16px;">Here is your day-of schedule:</p>
          
          <div class="event-name">${safeEventName}</div>
          <div class="event-dates">${safeEventDates}</div>
          
          ${safePersonalMessage ? `<div class="message">"${safePersonalMessage}"</div>` : ''}
          
          <p style="margin-bottom: 24px;">Click below to view the detailed timeline for the event:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${scheduleLink}" class="button">View Schedule</a>
          </p>
          
          <p style="color: #888; font-size: 13px;">Or copy this link: <a href="${scheduleLink}" style="color: #E8B4B8;">${scheduleLink}</a></p>
        </div>
        <div class="footer">
          ${safeSenderName}
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("=== SENDING EMAILS ===");
  console.log("To:", toEmails);
  const senderEmail = `${sanitizeSenderName(senderName)} <notifications@dateinquiry.com>`;
  console.log("From:", senderEmail);
  
  const results = await Promise.allSettled(
    toEmails.map(async (email) => {
      console.log("Attempting to send to:", email.trim());
      try {
        const result = await client.emails.send({
          from: senderEmail,
          to: email.trim(),
          subject: sanitizeSubject(`${senderName} shared a schedule with you: ${eventName}`),
          html: htmlContent
        });
        console.log("Resend API response for", email, ":", JSON.stringify(result));
        return result;
      } catch (err: any) {
        console.error("Resend API error for", email, ":", err.message, err);
        throw err;
      }
    })
  );

  console.log("All results:", JSON.stringify(results, null, 2));
  
  // Check for errors in fulfilled responses (Resend might return error objects)
  const successful = results.filter(r => {
    if (r.status === 'fulfilled') {
      const value = (r as any).value;
      // Check if response has an error field
      if (value?.error) {
        console.error("Resend returned error:", value.error);
        return false;
      }
      return true;
    }
    return false;
  }).length;
  
  const failed = results.length - successful;

  if (failed > 0) {
    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);
    console.error("Failed emails:", errors);
  }

  console.log("=== EMAIL RESULT: successful:", successful, "failed:", failed, "===");
  return { successful, failed, total: toEmails.length };
}

export async function sendInfoSheetEmail({
  toEmail,
  vendorName,
  vendorEmail,
  infoSheetContent,
  infoSheetPdfUrl,
  infoSheetType,
  eventDate,
  serviceType,
  chatLink
}: {
  toEmail: string;
  vendorName: string;
  vendorEmail?: string;
  infoSheetContent?: string;
  infoSheetPdfUrl?: string;
  infoSheetType: 'template' | 'custom' | 'pdf';
  eventDate: string;
  serviceType: string;
  chatLink?: string;
}): Promise<{ success: boolean; error?: string; result?: any }> {
  // Check if there's actually content to send
  const hasContent = infoSheetType === 'pdf' 
    ? !!infoSheetPdfUrl 
    : !!(infoSheetContent && infoSheetContent.trim());
  
  if (!hasContent) {
    console.warn(`[Info Sheet Email] Skipping - no content to send for ${vendorName}. Type: ${infoSheetType}`);
    return { success: false, error: 'No info sheet content configured' };
  }
  
  console.log("Getting Resend client for info sheet email...");
  const { client, fromEmail } = await getResendClient();
  
  // Convert plain text info sheet to HTML with line breaks preserved - escape HTML to prevent injection
  const formattedContent = infoSheetContent
    ? infoSheetContent
        .split('\n\n')
        .map(paragraph => `<p style="margin-bottom: 16px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('')
    : '';
  
  // For PDF type, we'll link to the PDF instead of showing content
  const isPdfType = infoSheetType === 'pdf' && infoSheetPdfUrl;
  
  // Build proper PDF link - handle both object paths (/objects/...) and full URLs
  let pdfLink: string | null = null;
  if (isPdfType && infoSheetPdfUrl) {
    if (infoSheetPdfUrl.startsWith('http')) {
      // Already a full URL
      pdfLink = infoSheetPdfUrl;
    } else {
      // Object path - need to prepend base URL
      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.REPLIT_DEPLOYMENT_URL || 'https://dateinquiry.com';
      pdfLink = `${baseUrl}${infoSheetPdfUrl}`;
    }
  }
  
  console.log('[Info Sheet Email] Type:', infoSheetType, 'PDF URL:', infoSheetPdfUrl, 'Link:', pdfLink);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; margin: 0; padding: 24px; color: #1a1a1a; }
        .container { max-width: 560px; margin: 0 auto; }
        .header { padding: 24px 0; text-align: center; border-bottom: 1px solid #e5e5e5; }
        .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; font-weight: 600; }
        .content { padding: 24px 0; color: #1a1a1a; line-height: 1.6; }
        .details { background: #f9f9f9; padding: 16px; margin: 16px 0; border-left: 3px solid #1a1a1a; }
        .info-content { padding: 16px 0; }
        .button { display: inline-block; background: #1a1a1a; color: #ffffff !important; padding: 12px 24px; text-decoration: none; font-size: 14px; margin: 16px 0; }
        .footer { padding: 24px 0; text-align: center; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(vendorName)}</h1>
        </div>
        <div class="content">
          <p>Thank you so much for reaching out! Here is my pricing and info sheet.</p>
          
          <div class="details">
            <strong>Your Inquiry</strong><br>
            Service: ${escapeHtml(serviceType)}<br>
            Date: ${escapeHtml(eventDate)}
          </div>
          
          <div class="info-content">
            ${isPdfType 
              ? `<p style="text-align: center; margin: 24px 0;">
                  <a href="${pdfLink}" class="button" target="_blank">
                    View Info Sheet
                  </a>
                </p>`
              : formattedContent
            }
          </div>
          
          <p style="margin: 16px 0; color: #1a1a1a;">Please let me know if you have any questions!</p>
          
          ${chatLink ? `
          <div style="text-align: center; margin: 24px 0; padding: 20px; background: #1a1a1a;">
            <p style="color: #ffffff; margin: 0 0 12px 0; font-size: 14px;">Have questions?</p>
            <a href="${chatLink}" 
               style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #1a1a1a; text-decoration: none; font-size: 14px;">
              Continue Conversation
            </a>
          </div>
          ` : ''}
          ${vendorEmail && !chatLink ? `<p style="margin-top: 16px; color: #666; font-size: 14px;">Reply to this email to continue the conversation.</p>` : ''}
        </div>
        <div class="footer">
          ${escapeHtml(vendorName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(vendorName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending info sheet email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      replyTo: vendorEmail,
      subject: sanitizeSubject(`Info from ${vendorName}`),
      html: htmlContent
    });
    console.log("Info sheet email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send info sheet email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendInvoiceEmail({
  toEmail,
  clientName,
  vendorName,
  amount,
  description,
  paymentLink,
  eventDate
}: {
  toEmail: string;
  clientName: string;
  vendorName: string;
  amount: number;
  description: string;
  paymentLink: string;
  eventDate?: string;
}) {
  console.log("Getting Resend client for invoice email...");
  const { client, fromEmail } = await getResendClient();

  const formattedAmount = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; margin: 0; padding: 24px; color: #1a1a1a; }
        .container { max-width: 560px; margin: 0 auto; }
        .header { padding: 24px 0; text-align: center; border-bottom: 1px solid #e5e5e5; }
        .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; font-weight: 600; }
        .content { padding: 24px 0; }
        .amount { font-size: 32px; color: #1a1a1a; font-weight: bold; text-align: center; margin: 24px 0; }
        .description { text-align: center; color: #666; font-size: 14px; margin-bottom: 16px; }
        .event-date { text-align: center; color: #666; font-size: 13px; margin-bottom: 16px; }
        .button { display: inline-block; background: #1a1a1a; color: #ffffff !important; padding: 14px 28px; text-decoration: none; font-size: 14px; }
        .footer { padding: 24px 0; text-align: center; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; }
        .secure { text-align: center; color: #888; font-size: 11px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(vendorName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 16px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 24px;">Here is your invoice:</p>
          
          <div class="amount">${formattedAmount}</div>
          <div class="description">${escapeHtml(description)}</div>
          ${eventDate ? `<div class="event-date">Event Date: ${escapeHtml(eventDate)}</div>` : ''}
          
          <p style="text-align: center; margin: 24px 0;">
            <a href="${paymentLink}" class="button">Pay Now</a>
          </p>
          
          <p class="secure">Secure payment via Square</p>
        </div>
        <div class="footer">
          ${escapeHtml(vendorName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(vendorName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending invoice email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`Invoice from ${vendorName} - ${formattedAmount}`),
      html: htmlContent
    });
    console.log("Invoice email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send invoice email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendContractEmail({
  toEmail,
  clientName,
  packageDetails,
  totalAmount,
  depositAmount,
  senderName
}: {
  toEmail: string;
  clientName: string;
  packageDetails: string;
  totalAmount: number;
  depositAmount: number;
  senderName: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .content { padding: 32px; }
        .contract-title { font-size: 18px; color: #6B4A55; margin-bottom: 20px; font-weight: bold; }
        .details { background: #f5f1e8; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; }
        .detail-value { font-weight: bold; color: #262329; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; letter-spacing: 1px; }
        .button:hover { background: #8a6270; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(senderName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 16px;">Here is your service contract:</p>
          
          <div class="contract-title">Service Contract</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Services</span>
              <span class="detail-value">${escapeHtml(packageDetails)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount</span>
              <span class="detail-value">$${totalAmount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Retainer Due</span>
              <span class="detail-value">$${depositAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Please review the contract details. Contact me if you have any questions.</p>
          
                  </div>
        <div class="footer">
          ${escapeHtml(senderName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(senderName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending contract email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`Contract for ${packageDetails} - ${clientName}`),
      html: htmlContent
    });
    console.log("Contract email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send contract email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendContractWithSigningLink({
  toEmail,
  clientName,
  packageDetails,
  totalAmount,
  depositAmount,
  senderName,
  signingUrl
}: {
  toEmail: string;
  clientName: string;
  packageDetails: string;
  totalAmount: number;
  depositAmount: number;
  senderName: string;
  signingUrl: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .content { padding: 32px; }
        .contract-title { font-size: 18px; color: #6B4A55; margin-bottom: 20px; font-weight: bold; }
        .details { background: #f5f1e8; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; }
        .detail-value { font-weight: bold; color: #262329; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; letter-spacing: 1px; }
        .button:hover { background: #8a6270; }
        .cta-section { text-align: center; margin: 32px 0; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(senderName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 16px;">Here is your service contract for signature:</p>
          
          <div class="contract-title">Service Contract</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Services</span>
              <span class="detail-value">${escapeHtml(packageDetails)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount</span>
              <span class="detail-value">$${totalAmount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Retainer Due</span>
              <span class="detail-value">$${depositAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Please review and sign the contract by clicking the button below:</p>
          
          <div class="cta-section">
            <a href="${signingUrl}" class="button">Sign Contract Now</a>
          </div>
          
          <p style="color: #888; font-size: 12px; text-align: center;">If you have any questions, please contact me.</p>
        </div>
        <div class="footer">
          ${escapeHtml(senderName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(senderName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending contract with signing link to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`Contract Ready for Signature: ${packageDetails}`),
      html: htmlContent
    });
    console.log("Contract signing email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send contract signing email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendContractSigningEmail({
  toEmail,
  clientName,
  artistName,
  packageDetails,
  totalAmount,
  depositAmount,
  signingUrl
}: {
  toEmail: string;
  clientName: string;
  artistName: string;
  packageDetails: string;
  totalAmount: number;
  depositAmount: number;
  signingUrl: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .content { padding: 32px; }
        .contract-title { font-size: 18px; color: #6B4A55; margin-bottom: 20px; font-weight: bold; text-align: center; }
        .details { background: #f5f1e8; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dotted #ccc; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; }
        .detail-value { font-weight: bold; color: #262329; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; letter-spacing: 1px; }
        .button:hover { background: #8a6270; }
        .cta-section { text-align: center; margin: 32px 0; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        .note { background: #fff8e7; border-left: 3px solid #C9A961; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(artistName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 16px;">Here is your service contract for your upcoming services:</p>
          
          <div class="contract-title">Service Contract</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Services</span>
              <span class="detail-value">${escapeHtml(packageDetails)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount</span>
              <span class="detail-value">$${totalAmount.toLocaleString()}</span>
            </div>
            ${depositAmount > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Retainer Due</span>
              <span class="detail-value">$${depositAmount.toLocaleString()}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="note">
            Please review the full contract terms carefully before signing. Once signed, this becomes a binding agreement.
          </div>
          
          <div class="cta-section">
            <a href="${signingUrl}" class="button">Review & Sign Contract</a>
          </div>
          
          <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">
            If you have any questions about the contract, please contact me before signing.
          </p>
        </div>
        <div class="footer">
          ${escapeHtml(artistName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(artistName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending contract signing email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Contract from ${artistName} - Ready for Your Signature`,
      html: htmlContent
    });
    console.log("Contract signing email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send contract signing email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendContractSignedNotification({
  toEmail,
  artistName,
  clientName,
  packageDetails,
  signedAt
}: {
  toEmail: string;
  artistName: string;
  clientName: string;
  packageDetails: string;
  signedAt: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const signedDate = new Date(signedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px),
            repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px);
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #6B4A55; opacity: 0.8; }
        .content { padding: 32px; }
        .success-icon { text-align: center; margin-bottom: 20px; }
        .success-icon svg { width: 64px; height: 64px; color: #3D5A3B; }
        .details { background: #f0f9f0; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3D5A3B; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="font-family: Georgia, serif; font-size: 24px; color: #1a1a1a;">Contract Signed</h1>
          </div>
        <div class="content">
          <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3D5A3B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          
          <h2 style="text-align: center; color: #3D5A3B; margin-bottom: 16px;">Contract Signed!</h2>
          
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(artistName)},</p>
          <p style="margin-bottom: 16px;">Great news! <strong>${escapeHtml(clientName)}</strong> has signed your contract.</p>
          
          <div class="details">
            <p style="margin: 0 0 8px 0;"><strong>Contract:</strong> ${escapeHtml(packageDetails)}</p>
            <p style="margin: 0;"><strong>Signed:</strong> ${signedDate}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            The signed contract is now stored in your dashboard. You can view it anytime from your Contracts page.
          </p>
        </div>
        <div class="footer">
          Your Private Secretary
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Your Secretary <notifications@dateinquiry.com>';
  
  try {
    console.log("Sending contract signed notification to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Contract Signed by ${clientName}`,
      html: htmlContent
    });
    console.log("Contract signed notification sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send contract signed notification:", err.message);
    return { success: false, error: err.message };
  }
}

// Send a copy of the signed contract to the client
export async function sendSignedContractCopyToClient({
  toEmail,
  clientName,
  artistName,
  packageDetails,
  totalAmount,
  depositAmount,
  eventDates,
  signedAt,
  contractHtml
}: {
  toEmail: string;
  clientName: string;
  artistName: string;
  packageDetails: string;
  totalAmount: number;
  depositAmount: number;
  eventDates?: string;
  signedAt: string;
  contractHtml?: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const signedDate = new Date(signedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (cents: number) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; margin: 0; padding: 24px; color: #1a1a1a; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { padding: 24px 0; text-align: center; border-bottom: 1px solid #e5e5e5; }
        .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; font-weight: 600; }
        .content { padding: 24px 0; }
        .success-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 24px; }
        .details { background: #f9f9f9; padding: 20px; border-left: 3px solid #1a1a1a; margin: 20px 0; }
        .detail-row { margin: 8px 0; }
        .detail-label { color: #666; font-size: 13px; }
        .detail-value { color: #1a1a1a; font-weight: 600; }
        .footer { padding: 24px 0; text-align: center; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(artistName)}</h1>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <span class="success-badge">Contract Signed</span>
          </div>
          
          <p style="margin-bottom: 16px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 24px;">Thank you for signing your contract. Here is a copy for your records.</p>
          
          <div class="details">
            <div class="detail-row">
              <div class="detail-label">Services</div>
              <div class="detail-value">${escapeHtml(packageDetails)}</div>
            </div>
            ${eventDates ? `
            <div class="detail-row">
              <div class="detail-label">Event Date</div>
              <div class="detail-value">${escapeHtml(eventDates)}</div>
            </div>
            ` : ''}
            <div class="detail-row">
              <div class="detail-label">Total Amount</div>
              <div class="detail-value">${formatCurrency(totalAmount)}</div>
            </div>
            ${depositAmount > 0 ? `
            <div class="detail-row">
              <div class="detail-label">Retainer</div>
              <div class="detail-value">${formatCurrency(depositAmount)}</div>
            </div>
            ` : ''}
            <div class="detail-row">
              <div class="detail-label">Signed On</div>
              <div class="detail-value">${signedDate}</div>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            Please keep this email for your records. If you have any questions, please contact ${escapeHtml(artistName)}.
          </p>
        </div>
        <div class="footer">
          ${escapeHtml(artistName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(artistName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending signed contract copy to client:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Your Signed Contract with ${artistName}`,
      html: htmlContent
    });
    console.log("Signed contract copy sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send signed contract copy:", err.message);
    return { success: false, error: err.message };
  }
}

// Send payment receipt to client
export async function sendPaymentReceiptToClient({
  toEmail,
  clientName,
  artistName,
  amount,
  description,
  paymentDate,
  paymentMethod
}: {
  toEmail: string;
  clientName: string;
  artistName: string;
  amount: number;
  description: string;
  paymentDate?: string;
  paymentMethod?: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const formattedAmount = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formattedDate = paymentDate 
    ? new Date(paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; margin: 0; padding: 24px; color: #1a1a1a; }
        .container { max-width: 560px; margin: 0 auto; }
        .header { padding: 24px 0; text-align: center; border-bottom: 1px solid #e5e5e5; }
        .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; font-weight: 600; }
        .content { padding: 24px 0; }
        .success-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 24px; }
        .amount { font-size: 36px; color: #1a1a1a; font-weight: bold; text-align: center; margin: 24px 0; }
        .receipt-box { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .receipt-row:last-child { border-bottom: none; }
        .receipt-label { color: #666; }
        .receipt-value { color: #1a1a1a; font-weight: 500; }
        .footer { padding: 24px 0; text-align: center; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(artistName)}</h1>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <span class="success-badge">Payment Received</span>
          </div>
          
          <p style="margin-bottom: 16px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 24px;">Thank you for your payment. Here is your receipt.</p>
          
          <div class="amount">${formattedAmount}</div>
          
          <div class="receipt-box">
            <div class="receipt-row">
              <span class="receipt-label">Description</span>
              <span class="receipt-value">${escapeHtml(description)}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Date</span>
              <span class="receipt-value">${formattedDate}</span>
            </div>
            ${paymentMethod ? `
            <div class="receipt-row">
              <span class="receipt-label">Payment Method</span>
              <span class="receipt-value">${escapeHtml(paymentMethod)}</span>
            </div>
            ` : ''}
            <div class="receipt-row">
              <span class="receipt-label">Status</span>
              <span class="receipt-value" style="color: #2e7d32;">Paid</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            Please keep this email as your receipt. If you have any questions, please contact ${escapeHtml(artistName)}.
          </p>
        </div>
        <div class="footer">
          ${escapeHtml(artistName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(artistName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending payment receipt to client:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Payment Receipt from ${artistName} - ${formattedAmount}`,
      html: htmlContent
    });
    console.log("Payment receipt sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send payment receipt:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendAppointmentConfirmationEmail({
  toEmail,
  clientName,
  artistBusinessName,
  artistLogoUrl,
  eventDate,
  eventTime,
  eventLocation,
  serviceType,
  paymentLink,
  chatLink,
  personalMessage
}: {
  toEmail: string;
  clientName: string;
  artistBusinessName: string;
  artistLogoUrl?: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  serviceType?: string;
  paymentLink?: string;
  chatLink?: string;
  personalMessage?: string;
}) {
  console.log("Getting Resend client for appointment confirmation email...");
  const { client, fromEmail } = await getResendClient();

  const logoHtml = artistLogoUrl 
    ? `<img src="${artistLogoUrl}" alt="${artistBusinessName}" style="max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 16px;" />`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background: linear-gradient(135deg, #FAF7F2 0%, #f9f4ed 100%);
          padding: 32px; 
          text-align: center;
          border-bottom: 2px solid #C9A961;
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0; color: #262329; }
        .content { padding: 32px; color: #262329; line-height: 1.6; }
        .details-card { background: #FAF7F2; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #C9A961; }
        .detail-row { display: flex; margin-bottom: 12px; }
        .detail-label { color: #666; width: 100px; font-size: 13px; }
        .detail-value { font-weight: 600; color: #262329; font-size: 14px; }
        .message-box { background: #f9f9f9; border-radius: 6px; padding: 16px; margin: 20px 0; font-style: italic; color: #555; border-left: 3px solid #6B4A55; }
        .button { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; letter-spacing: 0.5px; margin: 8px 4px; }
        .button-primary { background: #3D5A3B; color: white !important; }
        .button-secondary { background: #6B4A55; color: white !important; }
        .button-outline { background: transparent; color: #262329 !important; border: 1px solid #262329; }
        .cta-section { text-align: center; margin: 32px 0; }
        .footer { background: #262329; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #C9A961; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>${artistBusinessName}</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 24px;">Dear ${clientName},</p>
          <p style="margin-bottom: 16px;">Thank you for booking with <strong>${artistBusinessName}</strong>! We're excited to be part of your special day.</p>
          
          ${personalMessage ? `<div class="message-box">"${personalMessage}"</div>` : ''}
          
          <div class="details-card">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #6B4A55;">Appointment Details</h3>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${eventDate}</span>
            </div>
            ${eventTime ? `
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${eventTime}</span>
            </div>
            ` : ''}
            ${eventLocation ? `
            <div class="detail-row">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${eventLocation}</span>
            </div>
            ` : ''}
            ${serviceType ? `
            <div class="detail-row">
              <span class="detail-label">Service:</span>
              <span class="detail-value">${serviceType}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="cta-section">
            ${paymentLink ? `<a href="${paymentLink}" class="button button-primary">Complete Payment</a>` : ''}
            ${chatLink ? `<a href="${chatLink}" class="button button-secondary">Message Us</a>` : ''}
          </div>
          
          <p style="margin-top: 24px; font-size: 14px; color: #666;">We're looking forward to your appointment! If you have any questions, feel free to use the chat link above to message us directly. You can also upload your inspiration pictures there so we can prepare the perfect look for you.</p>
          
          <p style="margin-top: 32px;">Warmly,<br><strong>${artistBusinessName}</strong></p>
        </div>
        <div class="footer">
          <p>${artistBusinessName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(artistBusinessName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending appointment confirmation email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Your Appointment with ${artistBusinessName} - ${eventDate}`,
      html: htmlContent
    });
    console.log("Appointment confirmation email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send appointment confirmation email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendChatInviteEmail({
  toEmail,
  vendorName,
  clientName,
  chatLink,
  eventDate,
  serviceType,
  expiresAt
}: {
  toEmail: string;
  vendorName: string;
  clientName: string;
  chatLink: string;
  eventDate?: string;
  serviceType?: string;
  expiresAt?: Date;
}) {
  console.log("Getting Resend client for chat invite email...");
  const { client, fromEmail } = await getResendClient();
  
  const expiryText = expiresAt 
    ? `This invitation expires on ${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
    : 'This invitation will expire in 7 days.';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #F5F0E8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #FAF8F5; border-radius: 8px; overflow: hidden; border: 1px solid #E8E2D9; }
        .header { 
          background-color: #FAF8F5;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid #E8E2D9;
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; color: #1A1A1A; }
        .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #666; }
        .content { padding: 32px; color: #1A1A1A; line-height: 1.6; }
        .highlight-box { background: #F5F0E8; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 3px solid #1A1A1A; }
        .button { display: inline-block; background: #1A1A1A; color: #F5F0E8 !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; }
        .footer { background: #FAF8F5; color: #666; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #E8E2D9; }
        .footer a { color: #1A1A1A; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(vendorName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(clientName)},</p>
          <p style="margin-bottom: 20px;">I would like to connect with you to discuss your upcoming event!</p>
          
          ${eventDate || serviceType ? `
          <div class="highlight-box">
            <strong>Your Inquiry Details:</strong><br>
            ${serviceType ? `Service: ${serviceType}<br>` : ''}
            ${eventDate ? `Event Date: ${eventDate}` : ''}
          </div>
          ` : ''}
          
          <p style="margin-bottom: 16px;">Click below to start our conversation:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${chatLink}" class="button">Start Chat</a>
          </p>
          
          <p style="color: #666; font-size: 13px; margin-top: 24px;">${expiryText}</p>
          
          <p style="color: #666; font-size: 13px;">Or copy this link: <a href="${chatLink}" style="color: #1A1A1A;">${chatLink}</a></p>
        </div>
        <div class="footer">
          ${escapeHtml(vendorName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(vendorName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending chat invite email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`${vendorName} wants to connect with you`),
      html: htmlContent
    });
    console.log("Chat invite email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send chat invite email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendQuickChatInviteEmail({
  toEmail,
  artistName,
  participantName,
  chatLink,
  initialMessage
}: {
  toEmail: string;
  artistName: string;
  participantName: string;
  chatLink: string;
  initialMessage?: string | null;
}) {
  console.log("[Quick Chat Email] Sending to:", toEmail);
  const { client } = await getResendClient();
  
  const messagePreview = initialMessage 
    ? `<div style="background: #F5F0E8; border-left: 3px solid #1A1A1A; padding: 16px; margin: 20px 0; font-style: italic; color: #1A1A1A;">"${escapeHtml(initialMessage)}"</div>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #F5F0E8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #FAF8F5; border-radius: 8px; overflow: hidden; border: 1px solid #E8E2D9; }
        .header { 
          background-color: #FAF8F5;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid #E8E2D9;
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0; font-weight: normal; color: #1A1A1A; }
        .content { padding: 32px; color: #1A1A1A; line-height: 1.6; }
        .button { display: inline-block; background: #1A1A1A; color: #F5F0E8 !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; }
        .footer { background: #FAF8F5; color: #666; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #E8E2D9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(artistName)}</h1>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${escapeHtml(participantName)},</p>
          <p style="margin-bottom: 20px;">${escapeHtml(artistName)} would like to chat with you.</p>
          
          ${messagePreview}
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${chatLink}" class="button">Open Conversation</a>
          </p>
          
          <p style="color: #666; font-size: 13px;">Or copy this link: <a href="${chatLink}" style="color: #1A1A1A;">${chatLink}</a></p>
        </div>
        <div class="footer">
          Sent via Date Inquiry
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(artistName)} <notifications@dateinquiry.com>`;
  
  try {
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`${artistName} wants to chat with you`),
      html: htmlContent
    });
    console.log("[Quick Chat Email] Sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("[Quick Chat Email] Failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendGeneralEmail({
  to,
  subject,
  body,
  senderName,
  chatLink
}: {
  to: string;
  subject: string;
  body: string;
  senderName: string;
  chatLink?: string;
}) {
  const { client } = await getResendClient();
  const baseUrl = getBaseUrl();

  const safeSenderName = sanitizeSenderName(senderName) || 'Your Artist';
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>');
  const safeSubject = sanitizeSubject(subject);
  
  const chatButtonHtml = chatLink ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${chatLink}" style="display: inline-block; background: #6B4A55; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; letter-spacing: 1px; font-weight: bold;">Continue Chat</a>
    </div>
  ` : '';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px),
            repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px);
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #6B4A55; opacity: 0.8; }
        .content { padding: 32px; line-height: 1.6; color: #333; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${safeSenderName}</h1>
        </div>
        <div class="content">
          ${safeBody}
          ${chatButtonHtml}
        </div>
        <div class="footer">
          ${safeSenderName}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeSenderName} <notifications@dateinquiry.com>`;
  
  console.log("Sending general email to:", to);
  const result = await client.emails.send({
    from: senderEmail,
    to: to.trim(),
    subject: safeSubject,
    html: htmlContent
  });
  console.log("General email sent:", JSON.stringify(result));
  return { success: true, result };
}

export async function sendProposalEmail({
  toEmail,
  clientName,
  artistName,
  businessName,
  proposal,
  chatLink
}: {
  toEmail: string;
  clientName: string;
  artistName: string;
  businessName?: string;
  proposal: {
    lineItems?: { description: string; quantity: number; unitPrice: number; services: string[] }[] | null;
    subtotal?: number | null;
    travelFee?: number | null;
    discount?: number | null;
    total?: number | null;
    eventDate?: Date | null;
    eventLocation?: string | null;
    completionTime?: string | null;
    notes?: string | null;
    terms?: string | null;
    validUntil?: Date | null;
  };
  chatLink?: string;
}) {
  const { client } = await getResendClient();

  const safeArtistName = sanitizeSenderName(artistName) || 'Your Beauty Artist';
  const safeClientName = escapeHtml(clientName);
  const safeBusinessName = businessName ? escapeHtml(businessName) : safeArtistName;
  
  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };
  
  const lineItemsHtml = proposal.lineItems?.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice * item.quantity)}</td>
    </tr>
  `).join('') || '';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #FAF9F7; margin: 0; padding: 20px; }
        .container { max-width: 650px; margin: 0 auto; background: #FFFEF9; border: 1px solid #2C2C2C; }
        .inner { border: 1px solid #2C2C2C; margin: 4px; }
        .header { padding: 32px; text-align: center; border-bottom: 1px solid #2C2C2C; }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; color: #2C2C2C; }
        .header p { font-size: 14px; margin: 8px 0 0 0; color: #666; }
        .content { padding: 32px; }
        .proposal-title { font-size: 20px; color: #2C2C2C; margin-bottom: 24px; font-weight: bold; text-align: center; }
        .event-details { background: #FAF9F7; padding: 20px; margin-bottom: 24px; border: 1px solid #2C2C2C; }
        .event-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .event-label { color: #666; }
        .event-value { color: #2C2C2C; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #FAF9F7; padding: 12px; text-align: left; border-bottom: 2px solid #2C2C2C; color: #2C2C2C; font-weight: 600; }
        .totals { background: #FAF9F7; padding: 16px; border: 1px solid #2C2C2C; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.final { border-top: 2px solid #2C2C2C; padding-top: 16px; margin-top: 8px; font-size: 18px; font-weight: bold; }
        .notes { margin-top: 24px; padding: 16px; background: #FAF9F7; border: 1px solid #2C2C2C; font-size: 14px; color: #666; }
        .footer { text-align: center; padding: 24px; color: #666; font-size: 12px; border-top: 1px solid #2C2C2C; }
        .valid-until { text-align: center; padding: 12px; background: #FAF9F7; color: #666; font-size: 13px; margin-top: 24px; border: 1px solid #2C2C2C; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="inner">
          <div class="header">
            <h1>${safeBusinessName}</h1>
            <p>Service Proposal</p>
          </div>
          <div class="content">
            <p style="margin-bottom: 24px;">Hi ${safeClientName},</p>
            <p style="margin-bottom: 24px;">Thank you for your inquiry! Here is a detailed proposal for your upcoming event:</p>
            
            <div class="event-details">
              ${proposal.eventDate ? `<div style="margin-bottom: 8px;"><strong>Event Date:</strong> ${new Date(proposal.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
              ${proposal.eventLocation ? `<div style="margin-bottom: 8px;"><strong>Location:</strong> ${escapeHtml(proposal.eventLocation)}</div>` : ''}
              ${proposal.completionTime ? `<div><strong>Complete By:</strong> ${escapeHtml(proposal.completionTime)}</div>` : ''}
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatCurrency(proposal.subtotal)}</span>
              </div>
              ${proposal.travelFee ? `
              <div class="total-row">
                <span>Travel Fee</span>
                <span>${formatCurrency(proposal.travelFee)}</span>
              </div>
              ` : ''}
              ${proposal.discount ? `
              <div class="total-row">
                <span>Discount</span>
                <span>-${formatCurrency(proposal.discount)}</span>
              </div>
              ` : ''}
              <div class="total-row final">
                <span>Total</span>
                <span>${formatCurrency(proposal.total)}</span>
              </div>
            </div>
            
            ${proposal.notes ? `<div class="notes"><strong>Notes:</strong><br>${escapeHtml(proposal.notes).replace(/\n/g, '<br>')}</div>` : ''}
            
            ${proposal.terms ? `<div class="notes"><strong>Terms:</strong><br>${escapeHtml(proposal.terms).replace(/\n/g, '<br>')}</div>` : ''}
            
            ${proposal.validUntil ? `<div class="valid-until">This proposal is valid until ${new Date(proposal.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>` : ''}
            
            ${chatLink ? `
            <div style="text-align: center; margin-top: 32px;">
              <a href="${chatLink}" style="display: inline-block; background-color: #2C2C2C; color: #FFFEF9; padding: 16px 32px; text-decoration: none; font-size: 16px; font-weight: 500; border: 1px solid #2C2C2C;">
                Reply in Chat
              </a>
            </div>
            <p style="margin-top: 16px; color: #666; font-size: 14px; text-align: center;">
              Click above to continue the conversation with ${safeArtistName}
            </p>
            ` : `
            <p style="margin-top: 24px; color: #666; font-size: 14px;">
              To accept this proposal, please reply to this email or contact ${safeArtistName} directly.
            </p>
            `}
          </div>
          <div class="footer">
            ${safeBusinessName}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeArtistName} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending proposal email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Service Proposal from ${safeBusinessName}`,
      html: htmlContent
    });
    console.log("Proposal email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send proposal email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendInquiryNotificationEmail({
  toEmail,
  vendorName,
  clientName,
  clientEmail,
  eventDate,
  location,
  message,
  inquiryLink
}: {
  toEmail: string;
  vendorName: string;
  clientName: string;
  clientEmail?: string;
  eventDate: string;
  location?: string;
  message: string;
  inquiryLink: string;
}) {
  const { client } = await getResendClient();

  const safeVendorName = sanitizeSenderName(vendorName) || 'Artist';
  const safeClientName = escapeHtml(clientName);
  const safeClientEmail = clientEmail ? escapeHtml(clientEmail) : '';
  const safeLocation = location ? escapeHtml(location) : '';
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; margin: 0; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 24px; font-weight: normal; margin: 0 0 24px 0; }
        p { margin: 0 0 8px 0; line-height: 1.5; }
        .details { background: #f9f9f9; padding: 16px; margin: 16px 0; border-left: 3px solid #1a1a1a; }
        .detail-row { display: flex; margin-bottom: 8px; }
        .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; width: 80px; }
        .detail-value { color: #1a1a1a; }
        .button { display: inline-block; background: #1a1a1a; color: #ffffff !important; padding: 12px 24px; text-decoration: none; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin: 16px 0; }
        .signature { margin-top: 24px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; color: #666; }
      </style>
    </head>
    <body>
      <h1>New Inquiry</h1>
      <div class="details">
        <p style="margin-bottom: 12px;"><strong>${safeClientName}</strong></p>
        ${safeClientEmail ? `<p style="font-size: 14px; color: #666; margin-bottom: 8px;">${safeClientEmail}</p>` : ''}
        <p style="margin-top: 12px;"><strong>Date:</strong> ${eventDate}</p>
        ${safeLocation ? `<p><strong>Location:</strong> ${safeLocation}</p>` : ''}
      </div>
      ${safeMessage && safeMessage !== 'No message provided' ? `<p style="margin-top: 16px; font-style: italic; padding-left: 12px; border-left: 2px solid #ddd;">${safeMessage}</p>` : ''}
      <a href="${inquiryLink}" class="button">Review Inquiry</a>
      <p class="signature">${safeVendorName}</p>
    </body>
    </html>
  `;

  const senderEmail = 'notifications@dateinquiry.com';
  
  try {
    console.log("Sending inquiry notification email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `New Inquiry: ${safeClientName}`,
      html: htmlContent
    });
    console.log("Inquiry notification email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send inquiry notification email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendReferralNotificationEmail({
  toEmail,
  clientName,
  referrerName,
  declineReason,
  referralMessage,
  referralVendors
}: {
  toEmail: string;
  clientName: string;
  referrerName: string;
  declineReason: string;
  referralMessage?: string;
  referralVendors: Array<{ name: string }>;
}) {
  const { client } = await getResendClient();

  const safeClientName = escapeHtml(clientName);
  const safeReferrerName = escapeHtml(referrerName);
  const safeDeclineReason = escapeHtml(declineReason);
  const safeMessage = referralMessage ? escapeHtml(referralMessage) : '';
  
  const vendorList = referralVendors.map(v => `<li style="margin: 8px 0;">${escapeHtml(v.name)}</li>`).join('');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #FAF9F7; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #FFFEF9; overflow: hidden; }
        .header { 
          background-color: #FAF9F7;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid #6B4A55;
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #6B4A55; opacity: 0.8; }
        .content { padding: 32px; color: #6B4A55; }
        .message { font-style: italic; border-left: 2px solid #6B4A55; padding-left: 16px; margin: 20px 0; }
        .referrals { background: #FAF9F7; padding: 20px; margin: 24px 0; border: 1px solid #6B4A55; }
        .referrals h3 { margin: 0 0 12px 0; color: #6B4A55; }
        .referrals ul { margin: 0; padding-left: 20px; }
        .footer { text-align: center; padding: 20px; color: #6B4A55; font-size: 12px; border-top: 1px solid #6B4A55; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${safeReferrerName}</h1>
        </div>
        <div class="content">
          <p>Dear ${safeClientName},</p>
          
          <p>Unfortunately, I am not available for your event${safeDeclineReason ? ` (${safeDeclineReason})` : ''}.</p>
          
          ${safeMessage ? `<div class="message">${safeMessage}</div>` : ''}
          
          <p>However, I've recommended some wonderful colleagues who may be able to help:</p>
          
          <div class="referrals">
            <h3>Recommended Vendors</h3>
            <ul>${vendorList}</ul>
          </div>
          
          <p>These artists will be reaching out to you shortly.</p>
          
          <p>Warm regards,<br>${safeReferrerName}</p>
        </div>
        <div class="footer">
          ${safeReferrerName}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${sanitizeSenderName(referrerName)} <notifications@dateinquiry.com>`;
  
  try {
    console.log("Sending referral notification email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `${safeReferrerName} has recommended some vendors for your event`,
      html: htmlContent
    });
    console.log("Referral notification email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send referral notification email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetLink,
}: {
  toEmail: string;
  userName: string;
  resetLink: string;
}) {
  console.log("Getting Resend client for password reset email...");
  const { client, fromEmail } = await getResendClient();

  const safeUserName = escapeHtml(userName);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #1A1A1A; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #222; border-radius: 4px; overflow: hidden; }
        .header { 
          background-color: #1A1A1A;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(245, 240, 232, 0.1);
        }
        .header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24px; margin: 0; font-weight: normal; color: #F5F0E8; }
        .content { padding: 32px; line-height: 1.7; color: #F5F0E8; background: hsl(36, 18%, 93%); }
        .button { display: inline-block; background: hsl(0, 0%, 10%); color: hsl(36, 10%, 92%) !important; padding: 14px 28px; text-decoration: none; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: rgba(245, 240, 232, 0.5); font-size: 12px; background: #1A1A1A; }
        .note { font-size: 12px; color: hsl(0, 0%, 35%); margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Private Secretary</h1>
        </div>
        <div class="content">
          <p style="color: hsl(0, 0%, 10%);">Hi ${safeUserName},</p>
          
          <p style="color: hsl(0, 0%, 23%);">We received a request to reset your password. Click the button below to create a new password:</p>
          
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          
          <p class="note">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          
          <p style="color: hsl(0, 0%, 23%);">Best,<br>Your Private Secretary</p>
        </div>
        <div class="footer">
          Your Private Secretary
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Your Secretary <notifications@dateinquiry.com>';
  
  try {
    console.log("Sending password reset email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: 'Reset Your Password',
      html: htmlContent
    });
    console.log("Password reset email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send password reset email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendWaitlistConfirmationEmail({
  toEmail,
  eventDate,
  location,
  servicesNeeded
}: {
  toEmail: string;
  eventDate?: Date;
  location?: string;
  servicesNeeded?: string[];
}) {
  const { client } = await getResendClient();
  
  const eventDateStr = eventDate 
    ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  
  const servicesStr = servicesNeeded && servicesNeeded.length > 0 
    ? servicesNeeded.join(', ')
    : null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px),
            repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px);
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #6B4A55; opacity: 0.8; }
        .content { padding: 32px; color: #333; line-height: 1.6; }
        .details { background: #f5f1e8; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .details p { margin: 4px 0; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Private Secretary</h1>
          </div>
        <div class="content">
          <p>You're on the list!</p>
          
          <p>Thank you for joining the waitlist. We're building something special for beauty artists and their clients, and we can't wait to share it with you.</p>
          
          ${eventDateStr || location || servicesStr ? `
          <div class="details">
            <p><strong>Your Event Details:</strong></p>
            ${eventDateStr ? `<p>Event Date: ${eventDateStr}</p>` : ''}
            ${location ? `<p>Location: ${escapeHtml(location)}</p>` : ''}
            ${servicesStr ? `<p>Services: ${escapeHtml(servicesStr)}</p>` : ''}
          </div>
          ` : ''}
          
          <p>We'll reach out as soon as we're ready to help you find the perfect beauty artists for your special day.</p>
          
          <p>If you have any questions, please email <a href="mailto:notifications@dateinquiry.com" style="color: #6B4A55;">notifications@dateinquiry.com</a>.</p>
          
          <p>Already working with a beauty artist you love? Send them this link to join: <a href="https://dateinquiry.com/secretary" style="color: #6B4A55;">dateinquiry.com/secretary</a></p>
          
          <p>In the meantime, save this email so you can easily find us when the time comes.</p>
          
          <p>Warmly,<br>Your Private Secretary</p>
        </div>
        <div class="footer">
          Your Private Secretary
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Your Secretary <notifications@dateinquiry.com>';
  
  try {
    console.log("Sending waitlist confirmation email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: "You're on the waitlist!",
      html: htmlContent
    });
    console.log("Waitlist confirmation email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send waitlist confirmation email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendArtistWelcomeEmail({
  toEmail,
  artistName,
  businessName,
  calendarUrl,
  settingsUrl
}: {
  toEmail: string;
  artistName: string;
  businessName: string;
  calendarUrl: string;
  settingsUrl?: string;
}) {
  const { client } = await getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #FAF9F7; margin: 0; padding: 20px; color: #1a1a1a; }
        .container { max-width: 560px; margin: 0 auto; background: white; overflow: hidden; }
        .header { 
          background-color: #FAF9F7;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid #e5e5e5;
        }
        .header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24px; margin: 0; font-weight: 400; color: #1a1a1a; letter-spacing: -0.02em; }
        .content { padding: 32px; line-height: 1.6; }
        .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 16px; }
        .link-box { background: #f5f5f5; padding: 16px; margin: 24px 0; text-align: center; word-break: break-all; border-left: 3px solid #1a1a1a; }
        .link-box a { color: #1a1a1a; font-weight: 600; text-decoration: underline; font-size: 14px; }
        .button { display: inline-block; background: #1a1a1a; color: white !important; padding: 14px 28px; text-decoration: none; font-size: 14px; margin: 16px 0; }
        .tips { background: #f9f9f9; padding: 20px; margin: 24px 0; border-left: 3px solid #1a1a1a; }
        .tips h3 { color: #1a1a1a; margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
        .tips ul { margin: 0; padding-left: 20px; color: #444; }
        .tips li { margin: 8px 0; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Private Secretary</h1>
          </div>
        <div class="content">
          <p class="greeting">Welcome, ${escapeHtml(artistName)}!</p>
          
          <p>Your inquiry link for <strong>${escapeHtml(businessName)}</strong> is now live and ready to receive inquiries.</p>
          
          <div class="link-box">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Your inquiry link (share this with clients):</p>
            <a href="${calendarUrl}">${calendarUrl}</a>
          </div>
          
          <div class="tips">
            <h3>Next Steps:</h3>
            <ul>
              <li>Copy and add this link to your Instagram bio</li>
              <li>Share it when clients ask about booking</li>
            </ul>
          </div>
          
          ${settingsUrl ? `
          <p style="text-align: center; margin: 24px 0;">
            <a href="${settingsUrl}" class="button">Open My Dashboard</a>
          </p>
          ` : ''}
          
          <p>Your secretary is ready to work for you.</p>
          
          <p>Warmly,<br>Your Private Secretary</p>
        </div>
        <div class="footer">
          ${escapeHtml(businessName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Your Secretary <notifications@dateinquiry.com>';
  
  try {
    console.log("Sending artist welcome email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Welcome! Your inquiry link is live`,
      html: htmlContent
    });
    console.log("Artist welcome email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send artist welcome email:", err.message);
    return { success: false, error: err.message };
  }
}

// Send settings link to artist (for when they forget their admin link)
export async function sendSettingsLinkEmail({
  toEmail,
  artistName,
  businessName,
  settingsUrl,
  dashboardUrl
}: {
  toEmail: string;
  artistName: string;
  businessName?: string;
  settingsUrl: string;
  dashboardUrl?: string;
}) {
  const { client, fromEmail } = await getResendClient();
  const baseUrl = getBaseUrl();
  
  const safeArtistName = sanitizeSenderName(artistName) || 'Your Business';
  const safeBusinessName = businessName ? sanitizeSenderName(businessName) : safeArtistName;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #FAF9F7; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(107, 74, 85, 0.2);
        }
        .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
        .content { padding: 32px; line-height: 1.6; color: #333; }
        .button { display: inline-block; background: #6B4A55; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        .note { font-size: 13px; color: #666; margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(safeBusinessName)}</h1>
        </div>
        <div class="content">
          <p>Hi ${escapeHtml(safeArtistName)},</p>
          
          <p>You requested access to your account. Here are your private links:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${dashboardUrl || settingsUrl}" class="button">Open My Dashboard</a>
          </p>
          
          ${dashboardUrl ? `
          <p style="text-align: center; margin-top: 16px;">
            <a href="${settingsUrl}" style="color: #6B4A55; text-decoration: underline;">Settings &amp; Preferences</a>
          </p>
          ` : ''}
          
          <div class="note">
            <strong>Tip:</strong> Bookmark these links so you can find them easily! These are your private admin links - don't share them with clients.
          </div>
        </div>
        <div class="footer">
          ${escapeHtml(safeBusinessName)}
        </div>
      </div>
    </body>
    </html>
  `;

  // Use configured Resend from email (verified domain)
  const senderEmail = fromEmail || `${safeBusinessName} <notifications@${WHITELABEL_EMAIL_DOMAIN}>`;
  
  try {
    console.log("Sending settings link email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Your private settings link`,
      html: htmlContent
    });
    console.log("Settings link email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send settings link email:", err.message);
    return { success: false, error: err.message };
  }
}

// Send thread reply email to client
export async function sendThreadReplyEmail({
  toEmail,
  clientName,
  artistName,
  businessName,
  message,
  replyLink,
  cc
}: {
  toEmail: string;
  clientName: string;
  artistName: string;
  businessName?: string;
  message: string;
  replyLink: string;
  cc?: string[];
}) {
  console.log("Getting Resend client for thread reply email...");
  const { client, fromEmail } = await getResendClient();
  
  // Filter valid CC emails
  const validCc = cc?.filter(email => email && email.includes('@')) || [];
  
  const safeArtistName = sanitizeSenderName(artistName) || 'Your Artist';
  const safeBusinessName = businessName ? sanitizeSenderName(businessName) : safeArtistName;
  const safeClientName = sanitizeSenderName(clientName) || 'there';
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: hsl(36, 18%, 93%);
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid hsl(36, 8%, 75%);
        }
        .header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24px; margin: 0; font-weight: normal; color: hsl(0, 0%, 10%); }
        .content { padding: 32px; line-height: 1.7; color: hsl(0, 0%, 10%); }
        .message-box { background: hsl(36, 24%, 95%); padding: 20px; margin: 20px 0; border-left: 3px solid hsl(42, 33%, 57%); }
        .cta { text-align: center; margin: 28px 0; }
        .cta a { display: inline-block; background: hsl(0, 0%, 10%); color: hsl(36, 10%, 92%); padding: 14px 28px; text-decoration: none; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }
        .footer { text-align: center; padding: 20px; color: hsl(0, 0%, 35%); font-size: 12px; border-top: 1px solid hsl(36, 8%, 84%); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(safeBusinessName)}</h1>
        </div>
        <div class="content">
          <p>Hi ${escapeHtml(safeClientName)},</p>
          
          <p>${escapeHtml(safeArtistName)} sent you a message:</p>
          
          <div class="message-box">
            ${safeMessage}
          </div>
          
          <div class="cta">
            <a href="${replyLink}">View & Reply</a>
          </div>
          
          <p style="color: hsl(0, 0%, 35%); font-size: 13px;">Or copy this link: <a href="${replyLink}" style="color: hsl(42, 33%, 45%);">${replyLink}</a></p>
        </div>
        <div class="footer">
          ${escapeHtml(safeBusinessName)}
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeBusinessName} <${fromEmail}>`;
  
  try {
    console.log("Sending thread reply email to:", toEmail, "cc:", validCc.join(', ') || 'none');
    
    const emailPayload: any = {
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`New message from ${safeBusinessName}`),
      html: htmlContent
    };
    
    if (validCc.length > 0) {
      emailPayload.cc = validCc;
    }
    
    const result = await client.emails.send(emailPayload);
    console.log("Thread reply email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send thread reply email:", err.message);
    return { success: false, error: err.message };
  }
}

// Send notification to artist when client replies
export async function sendClientReplyNotification({
  toEmail,
  artistName,
  clientName,
  message,
  threadLink
}: {
  toEmail: string;
  artistName: string;
  clientName: string;
  message: string;
  threadLink: string;
}) {
  console.log("Getting Resend client for client reply notification...");
  const { client, fromEmail } = await getResendClient();
  
  const safeArtistName = sanitizeSenderName(artistName) || 'there';
  const safeClientName = sanitizeSenderName(clientName) || 'Your Client';
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #1A1A1A; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #222; border-radius: 4px; overflow: hidden; }
        .header { 
          background-color: #1A1A1A;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid #333;
        }
        .header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24px; margin: 0; font-weight: normal; color: #F5F0E8; }
        .content { padding: 32px; line-height: 1.7; color: #F5F0E8; }
        .message-box { background: #333; padding: 20px; margin: 20px 0; border-left: 3px solid #C4A35A; }
        .cta { text-align: center; margin: 28px 0; }
        .cta a { display: inline-block; background: #F5F0E8; color: #1A1A1A; padding: 14px 28px; text-decoration: none; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Client Reply</h1>
        </div>
        <div class="content">
          <p>Hi ${escapeHtml(safeArtistName)},</p>
          
          <p><strong>${escapeHtml(safeClientName)}</strong> replied to your inquiry:</p>
          
          <div class="message-box">
            ${safeMessage}
          </div>
          
          <div class="cta">
            <a href="${threadLink}">View Thread</a>
          </div>
          
          <p style="color: #888; font-size: 13px;">Or copy this link: <a href="${threadLink}" style="color: #C4A35A;">${threadLink}</a></p>
        </div>
        <div class="footer">
          Date Inquiry
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `Date Inquiry <${fromEmail}>`;
  
  try {
    console.log("Sending client reply notification to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`${safeClientName} replied to your inquiry`),
      html: htmlContent
    });
    console.log("Client reply notification sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send client reply notification:", err.message);
    return { success: false, error: err.message };
  }
}

// Send thread access links to client
export async function sendClientThreadAccessEmail({
  toEmail,
  clientName,
  threads
}: {
  toEmail: string;
  clientName: string;
  threads: Array<{
    threadToken: string;
    artistName: string;
    eventDate: string | Date | null;
    status: string;
  }>;
}) {
  console.log("Getting Resend client for thread access email...");
  const { client, fromEmail } = await getResendClient();
  
  const safeClientName = sanitizeSenderName(clientName) || 'there';
  
  const threadLinks = threads.map(t => {
    const eventDateStr = t.eventDate 
      ? new Date(t.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const statusLabel = t.status === 'pending' ? 'Pending' : 
                        t.status === 'accepted' ? 'Accepted' : 
                        t.status === 'deposit_paid' ? 'Confirmed' : 
                        t.status.charAt(0).toUpperCase() + t.status.slice(1);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid hsl(36, 8%, 84%);">
          <strong style="color: hsl(0, 0%, 10%);">${escapeHtml(t.artistName)}</strong><br>
          <span style="font-size: 12px; color: hsl(0, 0%, 35%);">${eventDateStr} • ${statusLabel}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid hsl(36, 8%, 84%); text-align: right;">
          <a href="https://${WHITELABEL_EMAIL_DOMAIN}/inquiry/${t.threadToken}" 
             style="display: inline-block; background: hsl(0, 0%, 10%); color: hsl(36, 10%, 92%); 
                    padding: 8px 16px; text-decoration: none; font-size: 12px;">View Thread</a>
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #1A1A1A; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #222; border-radius: 4px; overflow: hidden; }
        .header { 
          background-color: #1A1A1A;
          padding: 28px; 
          text-align: center;
          border-bottom: 1px solid rgba(245, 240, 232, 0.1);
        }
        .header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 24px; margin: 0; font-weight: normal; color: #F5F0E8; }
        .content { padding: 32px; line-height: 1.7; color: #F5F0E8; background: hsl(36, 18%, 93%); }
        .footer { text-align: center; padding: 20px; color: rgba(245, 240, 232, 0.5); font-size: 12px; background: #1A1A1A; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Inquiry Threads</h1>
        </div>
        <div class="content">
          <p style="color: hsl(0, 0%, 10%);">Hi ${escapeHtml(safeClientName)},</p>
          
          <p style="color: hsl(0, 0%, 23%);">Here are the inquiry threads associated with your email:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            ${threadLinks}
          </table>
          
          <p style="color: hsl(0, 0%, 35%); font-size: 13px;">Click "View Thread" to see your conversation with each artist.</p>
        </div>
        <div class="footer">
          Your Private Secretary
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `Your Secretary <${fromEmail}>`;
  
  try {
    console.log("Sending thread access email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: sanitizeSubject(`Your Inquiry Thread Links`),
      html: htmlContent
    });
    console.log("Thread access email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send thread access email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendLoginLinkEmail({
  toEmail,
  artistName,
  loginUrl
}: {
  toEmail: string;
  artistName: string;
  loginUrl: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #1A1A1A; margin: 0; padding: 40px 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #242424; border-radius: 8px; overflow: hidden; border: 1px solid rgba(245, 240, 232, 0.1); }
        .content { padding: 40px 32px; text-align: center; }
        .greeting { font-size: 24px; color: #F5F0E8; margin-bottom: 16px; font-weight: 500; }
        .message { color: rgba(245, 240, 232, 0.6); font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
        .button { display: inline-block; background: #F5F0E8; color: #1A1A1A !important; padding: 16px 40px; text-decoration: none; border-radius: 4px; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
        .button:hover { background: white; }
        .note { color: rgba(245, 240, 232, 0.4); font-size: 12px; margin-top: 32px; }
        .footer { text-align: center; padding: 20px 32px; color: rgba(245, 240, 232, 0.3); font-size: 11px; border-top: 1px solid rgba(245, 240, 232, 0.1); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <p class="greeting">Hello, ${escapeHtml(artistName)}</p>
          
          <p class="message">Click the button below to sign in to your dashboard. This link will expire in 24 hours.</p>
          
          <a href="${loginUrl}" class="button">Sign In</a>
          
          <p class="note">If you didn't request this link, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          Your Private Secretary
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `Your Secretary <${fromEmail}>`;
  
  try {
    console.log("Sending login link email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: "Your login link",
      html: htmlContent
    });
    console.log("Login link email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send login link email:", err.message);
    return { success: false, error: err.message };
  }
}

// Send circle invite email to someone not on the platform yet
export async function sendCircleInviteEmail({
  toEmail,
  inviteeName,
  inviterName,
  inviterBusinessName,
  inviteLink,
  personalNote
}: {
  toEmail: string;
  inviteeName: string;
  inviterName: string;
  inviterBusinessName?: string;
  inviteLink: string;
  personalNote?: string;
}) {
  const { client, fromEmail } = await getResendClient();
  
  const safeInviteeName = sanitizeSenderName(inviteeName) || 'there';
  const safeInviterName = sanitizeSenderName(inviterName) || 'A fellow artist';
  const safeBusinessName = inviterBusinessName ? sanitizeSenderName(inviterBusinessName) : safeInviterName;
  
  const noteSection = personalNote ? `
    <div style="background: rgba(245, 240, 232, 0.05); border-left: 2px solid rgba(196, 163, 90, 0.4); padding: 16px; margin: 24px 0; font-style: italic;">
      "${escapeHtml(personalNote)}"
    </div>
  ` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #1A1A1A; margin: 0; padding: 20px; color: #F5F0E8; }
        .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border: 1px solid rgba(245, 240, 232, 0.1); overflow: hidden; }
        .content { padding: 40px 32px; line-height: 1.7; }
        .greeting { font-size: 18px; margin-bottom: 24px; color: #F5F0E8; }
        .message { color: rgba(245, 240, 232, 0.8); margin-bottom: 16px; }
        .button { display: inline-block; background: #C4A35A; color: #1A1A1A; padding: 14px 32px; text-decoration: none; font-weight: 600; margin: 24px 0; }
        .footer { text-align: center; padding: 20px 32px; color: rgba(245, 240, 232, 0.3); font-size: 11px; border-top: 1px solid rgba(245, 240, 232, 0.1); }
        .highlight { color: #C4A35A; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <p class="greeting">Hi ${escapeHtml(safeInviteeName)},</p>
          
          <p class="message"><span class="highlight">${escapeHtml(safeBusinessName)}</span> has invited you to join their trusted network.</p>
          
          <p class="message">When you're part of someone's circle, they can refer clients to you when they're unavailable. It's a simple way to help each other grow.</p>
          
          ${noteSection}
          
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </p>
          
          <p class="message" style="font-size: 13px; color: rgba(245, 240, 232, 0.5);">This invite was sent by ${escapeHtml(safeBusinessName)}. If you don't know them, you can ignore this email.</p>
        </div>
        <div class="footer">
          Sent via Date Inquiry
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeBusinessName} <${fromEmail}>`;
  
  try {
    console.log("Sending circle invite email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `${safeBusinessName} invited you to their network`,
      html: htmlContent
    });
    console.log("Circle invite email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send circle invite email:", err.message);
    return { success: false, error: err.message };
  }
}
