import { Resend } from 'resend';

let connectionSettings: any;

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

  const senderEmail = 'Beauvette <noreply@beauvette.com>';
  
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

  const senderEmail = 'Beauvette <noreply@beauvette.com>';
  
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

  const senderEmail = 'Beauvette <noreply@beauvette.com>';
  
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

  const senderEmail = 'Beauvette <noreply@beauvette.com>';
  
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

  const senderEmail = `${artistBusinessName} via Beauvette <noreply@beauvette.com>`;
  
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

  const senderEmail = 'Beauvette <noreply@beauvette.com>';
  
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
