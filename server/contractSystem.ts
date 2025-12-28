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
  
  const clientName = contract.clientName || client?.firstName || 'Client';
  const clientLastName = client?.lastName || '';
  const fullClientName = `${clientName} ${clientLastName}`.trim();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  let serviceItemsHtml = '';
  if (contract.serviceItems && Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0) {
    serviceItemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f1e8;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Client</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">QTY</th>
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
            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</td>
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
      
      <p>This service contract is entered into as of ${today} between ${fullClientName} (Client) and ${artistName} (Artist). The Client and the Artist agree as follows:</p>
      
      <h3>1. SERVICE to be PROVIDED</h3>
      <p>Artist will provide services to client as specified in Attachment A.</p>
      
      <h3>2. LOCATION of SERVICE</h3>
      <p>The service will take place at the following location: ${contract.eventLocation || 'To be determined'}</p>
      
      <h3>3. DATE and TIME of SERVICE</h3>
      <p>The date of Service: ${contract.eventDates || 'To be determined'}</p>
      <p>Service Begins: ${contract.serviceStartTime || 'TBD'} (We will arrive a few minutes early to set up)</p>
      <p>Service Completion: ${contract.serviceEndTime || 'TBD'}</p>
      
      <h3>4. PARKING</h3>
      <p>Valet parking is required for all hotel getting ready locations. The amount of equipment required for day of services is extensive and to ensure ease for the artist and timely arrival, valet parking will be charged to the room at the time of arrival.</p>
      
      <h3>5. PAYMENT</h3>
      <p>In full consideration for all services rendered by Artist at the location, the Client agrees to make deposit and payment in U.S. funds to the Artist, as provided in Attachment A.</p>
      
      <h3>6. CANCELLATION</h3>
      <p>Cancellations can be made 30 days prior to the event without penalty other than loss of the retainer amount. In case of cancellations less than two calendar weeks retainer and final payment will not be refunded. The retainer is non refundable.</p>
      <p>The Artist's obligation is to give services as provided in Attachment A. If Artist is unavailable as a result of sickness, accidents, acts of God or other reasons beyond the Artist's control, artist will make all commercially reasonable efforts to arrange for comparable services agreed upon within this contract.</p>
      
      <h3>7. MISCELLANEOUS</h3>
      <p>The service contract and specified attachments set forth the entire agreement between the Artist and Client, and may not be amended except in writing signed by both parties. This service contract will be governed by and construed in accordance with the laws of the State of California.</p>
      
      <div class="signature-section">
        <div class="signature-box">
          <strong>Client Signature</strong>
          <div class="signature-line"></div>
          <p style="font-size: 12px;">Date: _________________</p>
        </div>
        <div class="signature-box">
          <strong>Artist Signature</strong>
          <div class="signature-line"></div>
          <p style="font-size: 12px;">${artistName}</p>
          <p style="font-size: 12px;">Date: _________________</p>
        </div>
      </div>
      
      <h3 style="margin-top: 48px;">Attachment A</h3>
      ${serviceItemsHtml || `<p>${contract.packageDetails || 'Services as agreed'}</p>`}
      
      <div style="margin-top: 24px;">
        <p><strong>Client Contact:</strong> ${contract.clientContact || client?.email || ''}</p>
        ${contract.photographerInfo ? `<p><strong>Photographer:</strong> ${contract.photographerInfo}</p>` : ''}
      </div>
      
      <div style="margin-top: 24px;">
        <p><strong>Payment:</strong></p>
        <p>A Square invoice will be sent for payment</p>
        <ul style="margin-top: 8px;">
          <li>Retainer amount is to hold the date: ${formatCurrency(contract.depositAmount || 0)}. No date is guaranteed without the signed contract and retainer amount. Retainer is non refundable and required at the same time.</li>
          <li>Payment of Balance: Two weeks before wedding date the Client will pay the Artist the remaining balance of ${formatCurrency((contract.totalAmount || 0) - (contract.depositAmount || 0))} via Square invoice</li>
        </ul>
      </div>
    </body>
    </html>
  `;
}
