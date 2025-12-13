import { Resend } from 'resend';

let connectionSettings: any;

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
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  console.log("Connectors hostname:", hostname);
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error("No X_REPLIT_TOKEN found");
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }
  console.log("Token type:", xReplitToken.split(' ')[0]);

  const url = 'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend';
  console.log("Fetching from:", url);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });
  
  const data = await response.json();
  console.log("Connectors response status:", response.status);
  console.log("Connectors response data:", JSON.stringify(data, null, 2));
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
    console.error("Resend not connected - no API key found in settings");
    throw new Error('Resend not connected');
  }
  
  console.log("Got Resend API key (first 8 chars):", connectionSettings.settings.api_key?.substring(0, 8) + "...");
  console.log("From email:", connectionSettings.settings.from_email);
  
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
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
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi there,</p>
          <p style="margin-bottom: 16px;"><strong>${senderName}</strong> has shared a day-of schedule with you:</p>
          
          <div class="event-name">${eventName}</div>
          <div class="event-dates">${eventDates}</div>
          
          ${personalMessage ? `<div class="message">"${personalMessage}"</div>` : ''}
          
          <p style="margin-bottom: 24px;">Click below to view the detailed timeline for the event:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${scheduleLink}" class="button">View Schedule</a>
          </p>
          
          <p style="color: #888; font-size: 13px;">Or copy this link: <a href="${scheduleLink}" style="color: #E8B4B8;">${scheduleLink}</a></p>
        </div>
        <div class="footer">
          Sent via Beauvette - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("=== SENDING EMAILS ===");
  console.log("To:", toEmails);
  // Domain verified! Using beauvette.com
  const senderEmail = 'Violet from Beauvette <violet@beauvette.com>';
  console.log("From:", senderEmail);
  
  const results = await Promise.allSettled(
    toEmails.map(async (email) => {
      console.log("Attempting to send to:", email.trim());
      try {
        const result = await client.emails.send({
          from: senderEmail,
          to: email.trim(),
          subject: `${senderName} shared a schedule with you: ${eventName}`,
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
  serviceType
}: {
  toEmail: string;
  vendorName: string;
  vendorEmail?: string;
  infoSheetContent?: string;
  infoSheetPdfUrl?: string;
  infoSheetType: 'template' | 'custom' | 'pdf';
  eventDate: string;
  serviceType: string;
}) {
  console.log("Getting Resend client for info sheet email...");
  const { client, fromEmail } = await getResendClient();
  
  // Convert plain text info sheet to HTML with line breaks preserved
  const formattedContent = infoSheetContent
    ? infoSheetContent
        .split('\n\n')
        .map(paragraph => `<p style="margin-bottom: 16px;">${paragraph.replace(/\n/g, '<br>')}</p>`)
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
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.REPLIT_DEPLOYMENT_URL || 'https://beauvette.com';
      pdfLink = `${baseUrl}${infoSheetPdfUrl}`;
    }
  }
  
  console.log('[Info Sheet Email] Type:', infoSheetType, 'PDF URL:', infoSheetPdfUrl, 'Link:', pdfLink);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { 
          background-color: #FAF7F2;
          background-image: linear-gradient(45deg, rgba(107, 74, 85, 0.08) 25%, transparent 25%), 
                            linear-gradient(-45deg, rgba(107, 74, 85, 0.08) 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, rgba(107, 74, 85, 0.08) 75%), 
                            linear-gradient(-45deg, transparent 75%, rgba(107, 74, 85, 0.08) 75%);
          background-size: 16px 16px;
          padding: 32px; 
          text-align: center; 
          border-bottom: 2px solid #C9A961; 
        }
        .header h1 { margin: 0; font-size: 28px; color: #262329; font-weight: normal; }
        .header p { margin: 8px 0 0 0; font-size: 14px; color: #666; font-style: italic; }
        .content { padding: 32px; color: #262329; line-height: 1.6; }
        .vendor-name { font-size: 20px; color: #262329; font-weight: bold; margin-bottom: 8px; }
        .inquiry-details { background: #f9f9f9; border-radius: 6px; padding: 16px; margin: 20px 0; border-left: 3px solid #C9A961; }
        .info-sheet { background: #FAF7F2; border-radius: 6px; padding: 24px; margin: 24px 0; }
        .footer { background: #262329; color: white; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Thank you for your inquiry! Here's important information from <strong>${vendorName}</strong>:</p>
          
          <div class="inquiry-details">
            <strong>Your Inquiry Details:</strong><br>
            Service: ${serviceType}<br>
            Date: ${eventDate}
          </div>
          
          <div class="info-sheet">
            ${isPdfType 
              ? `<p style="text-align: center; margin: 20px 0;">
                  <a href="${pdfLink}" 
                     style="display: inline-block; padding: 12px 24px; background: #262329; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;"
                     target="_blank">
                    View Pricing & Info Sheet
                  </a>
                </p>
                <p style="text-align: center; color: #666; font-size: 13px;">
                  Click above to view the full pricing and information sheet from ${vendorName}
                </p>`
              : formattedContent
            }
          </div>
          
          ${vendorEmail ? `<p style="margin-top: 24px; color: #666; font-size: 14px;">To continue the conversation, reply directly to <a href="mailto:${vendorEmail}" style="color: #E8B4B8;">${vendorEmail}</a></p>` : ''}
        </div>
        <div class="footer">
          Sent via Beauvette - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending info sheet email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      replyTo: vendorEmail,
      subject: `Inquiry Received - Info from ${vendorName}`,
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
        .amount { font-size: 32px; color: #3D5A3B; font-weight: bold; text-align: center; margin: 24px 0; }
        .description { text-align: center; color: #666; font-size: 14px; margin-bottom: 24px; }
        .event-date { text-align: center; color: #6B4A55; font-size: 13px; margin-bottom: 16px; font-style: italic; }
        .button { display: inline-block; background: #3D5A3B; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; letter-spacing: 1px; }
        .button:hover { background: #4a6d48; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        .secure { text-align: center; color: #888; font-size: 11px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 16px;">Hi ${clientName},</p>
          <p style="margin-bottom: 24px;"><strong>${vendorName}</strong> has sent you an invoice:</p>
          
          <div class="amount">${formattedAmount}</div>
          <div class="description">${description}</div>
          ${eventDate ? `<div class="event-date">Event Date: ${eventDate}</div>` : ''}
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${paymentLink}" class="button">Pay Now</a>
          </p>
          
          <p class="secure">Secure payment powered by Stripe. Accept Apple Pay, cards, Klarna & more.</p>
          
          <p style="color: #888; font-size: 13px; margin-top: 24px;">Or copy this link: <a href="${paymentLink}" style="color: #E8B4B8;">${paymentLink}</a></p>
        </div>
        <div class="footer">
          Sent via Beauvette - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending invoice email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Invoice from ${vendorName} - ${formattedAmount}`,
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
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${clientName},</p>
          <p style="margin-bottom: 16px;"><strong>${senderName}</strong> has sent you a service contract:</p>
          
          <div class="contract-title">Beauty Services Contract</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Services</span>
              <span class="detail-value">${packageDetails}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount</span>
              <span class="detail-value">$${totalAmount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Deposit Due</span>
              <span class="detail-value">$${depositAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Please review the attached contract details. Contact ${senderName} if you have any questions about the services or payment terms.</p>
          
          <p style="color: #888; font-size: 12px;">Note: For secure e-signature capability, contracts can be set up with DocuSign for formal signing and record-keeping.</p>
        </div>
        <div class="footer">
          Sent via Beauvette - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending contract email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Contract for ${packageDetails} - ${clientName}`,
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
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${clientName},</p>
          <p style="margin-bottom: 16px;"><strong>${senderName}</strong> has sent you a service contract for signature:</p>
          
          <div class="contract-title">Beauty Services Contract</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Services</span>
              <span class="detail-value">${packageDetails}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount</span>
              <span class="detail-value">$${totalAmount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Deposit Due</span>
              <span class="detail-value">$${depositAmount.toLocaleString()}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Please review and sign the contract by clicking the button below:</p>
          
          <div class="cta-section">
            <a href="${signingUrl}" class="button">Sign Contract Now</a>
          </div>
          
          <p style="color: #888; font-size: 12px; text-align: center;">If you have any questions, please contact ${senderName}.</p>
        </div>
        <div class="footer">
          Sent via Beauvette - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending contract with signing link to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `Contract Ready for Signature: ${packageDetails}`,
      html: htmlContent
    });
    console.log("Contract signing email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send contract signing email:", err.message);
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
          
          <p style="margin-top: 24px; font-size: 14px; color: #666;">If you have any questions or need to make changes, please don't hesitate to reach out. We look forward to seeing you!</p>
          
          <p style="margin-top: 32px;">Warmly,<br><strong>${artistBusinessName}</strong></p>
        </div>
        <div class="footer">
          <p>Sent via <a href="https://beauvette.com">Beauvette</a> - Beauty services for life's most important days</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${artistBusinessName} via Beauvette <violet@beauvette.com>`;
  
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
        .content { padding: 32px; color: #262329; line-height: 1.6; }
        .highlight-box { background: linear-gradient(135deg, #FAF7F2 0%, #f9f4ed 100%); border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 3px solid #C9A961; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 15px; letter-spacing: 1px; font-weight: bold; }
        .button:hover { background: #8a6270; }
        .footer { background: #262329; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #C9A961; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p style="margin-bottom: 24px;">Hi ${clientName},</p>
          <p style="margin-bottom: 20px;"><strong>${vendorName}</strong> would like to connect with you to discuss your upcoming event!</p>
          
          ${eventDate || serviceType ? `
          <div class="highlight-box">
            <strong>Your Inquiry Details:</strong><br>
            ${serviceType ? `Service: ${serviceType}<br>` : ''}
            ${eventDate ? `Event Date: ${eventDate}` : ''}
          </div>
          ` : ''}
          
          <p style="margin-bottom: 16px;">Click below to create your Beauvette account and start chatting with ${vendorName} about your event:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${chatLink}" class="button">Start Chat</a>
          </p>
          
          <p style="color: #888; font-size: 13px; margin-top: 24px;">${expiryText}</p>
          
          <p style="color: #888; font-size: 13px;">Or copy this link: <a href="${chatLink}" style="color: #C9A961;">${chatLink}</a></p>
        </div>
        <div class="footer">
          Sent via <a href="https://beauvette.com">Beauvette</a> - Beauty services for life's most important days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending chat invite email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `${vendorName} wants to connect with you on Beauvette`,
      html: htmlContent
    });
    console.log("Chat invite email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send chat invite email:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendGeneralEmail({
  to,
  subject,
  body,
  senderName
}: {
  to: string;
  subject: string;
  body: string;
  senderName: string;
}) {
  const { client } = await getResendClient();

  const safeSenderName = sanitizeSenderName(senderName) || 'Beauvette User';
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>');
  const safeSubject = sanitizeSubject(subject);
  
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
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          ${safeBody}
        </div>
        <div class="footer">
          Sent by ${safeSenderName} via <a href="https://beauvette.com" style="color: #C9A961;">Beauvette</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeSenderName} via Beauvette <violet@beauvette.com>`;
  
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
            Sent by ${safeArtistName} via <a href="https://beauvette.com" style="color: #2C2C2C;">Beauvette</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = `${safeArtistName} via Beauvette <violet@beauvette.com>`;
  
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
  eventDate,
  message,
  inquiryLink
}: {
  toEmail: string;
  vendorName: string;
  clientName: string;
  eventDate: string;
  message: string;
  inquiryLink: string;
}) {
  const { client } = await getResendClient();

  const safeVendorName = sanitizeSenderName(vendorName) || 'Artist';
  const safeClientName = escapeHtml(clientName);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  
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
        .content { padding: 32px; }
        .alert { background: #6B4A55; color: #FFFEF9; padding: 16px; text-align: center; margin-bottom: 24px; font-weight: bold; }
        .client-info { background: #FAF9F7; padding: 20px; margin-bottom: 24px; border: 1px solid #6B4A55; }
        .client-name { font-size: 18px; color: #6B4A55; margin-bottom: 8px; font-weight: bold; }
        .event-date { color: #6B4A55; font-size: 14px; margin-bottom: 12px; }
        .message { font-style: italic; color: #6B4A55; border-left: 2px solid #6B4A55; padding-left: 16px; }
        .button { display: inline-block; background: #6B4A55; color: #FFFEF9 !important; padding: 14px 28px; text-decoration: none; font-size: 14px; letter-spacing: 1px; }
        .footer { text-align: center; padding: 20px; color: #6B4A55; font-size: 12px; border-top: 1px solid #6B4A55; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <div class="alert">New Inquiry!</div>
          
          <div class="client-info">
            <div class="client-name">${safeClientName}</div>
            <div class="event-date">Event Date: ${eventDate}</div>
            <div class="message">${safeMessage || 'No message provided'}</div>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${inquiryLink}" class="button">Respond Now</a>
          </div>
        </div>
        <div class="footer">
          Sent to ${safeVendorName} via <a href="https://beauvette.com" style="color: #6B4A55;">Beauvette</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending inquiry notification email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: `New inquiry from ${safeClientName} for ${eventDate}`,
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
          <h1>Beauvette</h1>
          <p>For Life's Most Important Days</p>
        </div>
        <div class="content">
          <p>Dear ${safeClientName},</p>
          
          <p>Unfortunately, ${safeReferrerName} is not available for your event${safeDeclineReason ? ` (${safeDeclineReason})` : ''}.</p>
          
          ${safeMessage ? `<div class="message">${safeMessage}</div>` : ''}
          
          <p>However, they've recommended some wonderful colleagues who may be able to help:</p>
          
          <div class="referrals">
            <h3>Recommended Vendors</h3>
            <ul>${vendorList}</ul>
          </div>
          
          <p>These vendors will be reaching out to you shortly. You can also expect inquiries directly in your inbox.</p>
          
          <p>Warm regards,<br>The Beauvette Team</p>
        </div>
        <div class="footer">
          <a href="https://beauvette.com" style="color: #6B4A55;">Beauvette</a> - For Life's Most Important Days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
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
        .content { padding: 32px; color: #333; line-height: 1.6; }
        .button { display: inline-block; background: #6B4A55; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; letter-spacing: 1px; margin: 20px 0; }
        .button:hover { background: #8a6270; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
        .note { font-size: 12px; color: #888; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Beauvette</h1>
        </div>
        <div class="content">
          <p>Hi ${safeUserName},</p>
          
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          
          <p class="note">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          
          <p>Best,<br>The Beauvette Team</p>
        </div>
        <div class="footer">
          <a href="https://beauvette.com" style="color: #6B4A55;">Beauvette</a> - For Life's Most Important Days
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = 'Beauvette <violet@beauvette.com>';
  
  try {
    console.log("Sending password reset email to:", toEmail);
    const result = await client.emails.send({
      from: senderEmail,
      to: toEmail.trim(),
      subject: 'Reset Your Beauvette Password',
      html: htmlContent
    });
    console.log("Password reset email sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (err: any) {
    console.error("Failed to send password reset email:", err.message);
    return { success: false, error: err.message };
  }
}
