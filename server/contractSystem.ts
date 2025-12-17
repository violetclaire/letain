// Complete contract system - helper for routes
import { storage } from "./storage";

export async function getContractForSigning(token: string) {
  const contract = await storage.getContractBySigningToken(token);
  if (!contract) {
    throw new Error("Contract not found or signing link has expired");
  }
  return contract;
}

export async function signContract(token: string, data: {
  signedByName: string;
  signedByEmail: string;
  clientSignature: string;
}) {
  const contract = await storage.getContractBySigningToken(token);
  if (!contract) {
    throw new Error("Contract not found");
  }

  if (contract.status === "signed") {
    throw new Error("This contract has already been signed");
  }

  const updated = await storage.updateContract(contract.id, {
    status: "signed",
    signedAt: new Date(),
    signedByName: data.signedByName,
    signedByEmail: data.signedByEmail,
    clientSignature: data.clientSignature,
  });

  // Send notification email to artist
  try {
    const artist = await storage.getUser(contract.artistId);
    if (artist?.email) {
      const { sendContractSignedNotification } = await import("./emailService");
      await sendContractSignedNotification({
        toEmail: artist.email,
        artistName: artist.firstName || "Artist",
        clientName: data.signedByName,
        packageDetails: contract.packageDetails,
        signedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }

  return updated;
}

export function buildContractHtml(contract: any, client: any, artistName: string): string {
  const formatCurrency = (cents: number) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  let serviceItemsHtml = '';
  if (contract.serviceItems && Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0) {
    serviceItemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f1e8;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Client Type</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Service</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${contract.serviceItems.map((item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.clientType || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty || 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.service || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.price || 0)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.total || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold;">
            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(contract.totalAmount || 0)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Service Contract</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; color: #6B4A55; margin-bottom: 8px; text-align: center; }
        h2 { font-size: 18px; color: #333; font-weight: normal; text-align: center; }
        h3 { border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 8px; border: 1px solid #ddd; }
        th { background: #f5f1e8; text-align: left; }
        .signature-section { margin-top: 48px; padding-top: 24px; border-top: 1px solid #ccc; }
        .signature-box { display: inline-block; width: 45%; margin: 20px 2%; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; height: 60px; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div style="text-align: center; margin-bottom: 32px;">
        <h1>${artistName}</h1>
        <h2>Service Contract</h2>
      </div>
      
      <div style="margin-bottom: 24px;">
        <p><strong>Client:</strong> ${contract.clientName || client?.firstName || 'Client'} ${client?.lastName || ''}</p>
        ${contract.clientContact ? `<p><strong>Contact:</strong> ${contract.clientContact}</p>` : ''}
        ${contract.eventDates ? `<p><strong>Event Date(s):</strong> ${contract.eventDates}</p>` : ''}
        ${contract.eventLocation ? `<p><strong>Location:</strong> ${contract.eventLocation}</p>` : ''}
        ${contract.serviceStartTime && contract.serviceEndTime ? `<p><strong>Service Time:</strong> ${contract.serviceStartTime} - ${contract.serviceEndTime}</p>` : ''}
      </div>
      
      <h3>1. SERVICE</h3>
      <p>${contract.packageDetails || 'Beauty services as specified'}</p>
      ${serviceItemsHtml}
      
      <h3>2. LOCATION</h3>
      <p>${contract.eventLocation || 'To be determined'}</p>
      
      <h3>3. DATE/TIME</h3>
      <p><strong>Event Date:</strong> ${contract.eventDates || 'To be determined'}</p>
      ${contract.serviceStartTime ? `<p><strong>Start Time:</strong> ${contract.serviceStartTime}</p>` : ''}
      ${contract.serviceEndTime ? `<p><strong>End Time:</strong> ${contract.serviceEndTime}</p>` : ''}
      
      <h3>4. PARKING</h3>
      <p>Parking should be provided at the service location or nearby. Client to notify artist of any parking restrictions.</p>
      
      <h3>5. PAYMENT</h3>
      <p><strong>Total Amount:</strong> ${formatCurrency(contract.totalAmount)}</p>
      ${contract.depositAmount ? `<p><strong>Deposit Required:</strong> ${formatCurrency(contract.depositAmount)}</p>` : ''}
      ${contract.balanceDueDate ? `<p><strong>Balance Due:</strong> ${contract.balanceDueDate}</p>` : '<p><strong>Balance Due:</strong> Two weeks before wedding date</p>'}
      <p><strong>Payment Method:</strong> Square (credit card, debit card, Apple Pay)</p>
      
      <h3>6. CANCELLATION</h3>
      <p>If Client cancels this Agreement, Artist will be entitled to compensation for work done prior to the cancellation date, subject to the retainer amount. If Artist cancels this Agreement, Artist shall return all payment(s) received from Client.</p>
      
      <h3>7. MISCELLANEOUS</h3>
      <p>Artist is not responsible for damage caused by any third party. Client agrees to communicate any concerns directly with Artist before, during, and after the event. Both parties agree to act in good faith to resolve any disputes.</p>
      
      <div class="signature-section">
        <p style="color: #666; font-size: 13px;">
          By signing below, Client agrees to the terms and conditions outlined in this contract.
        </p>
        <div class="signature-box">
          <strong>Artist</strong>
          <div class="signature-line"></div>
          <p style="font-size: 12px;">${artistName}</p>
          <p style="font-size: 12px;">Date: _________________</p>
        </div>
        <div class="signature-box">
          <strong>Client</strong>
          <div class="signature-line"></div>
          <p style="font-size: 12px;">${contract.clientName || 'Client'}</p>
          <p style="font-size: 12px;">Date: _________________</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
