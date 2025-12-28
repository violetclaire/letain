import { storage } from "./storage";

const OPENSIGN_API_URL = process.env.OPENSIGN_API_URL || "https://app.opensignlabs.com";
const OPENSIGN_API_TOKEN = process.env.OPENSIGN_API_TOKEN;

interface OpenSignSigner {
  name: string;
  email: string;
  role?: string;
}

interface CreateDocumentResponse {
  success: boolean;
  documentId?: string;
  signingUrl?: string;
  error?: string;
}

interface GetDocumentResponse {
  success: boolean;
  status?: string;
  certificateUrl?: string;
  signedAt?: string;
  error?: string;
}

export async function createSigningDocument(
  contractId: string,
  title: string,
  pdfBase64: string,
  signers: OpenSignSigner[],
  expiryDays: number = 30
): Promise<CreateDocumentResponse> {
  if (!OPENSIGN_API_TOKEN) {
    console.warn("[OpenSign] API token not configured - using mock mode");
    const mockDocId = `mock_${contractId}_${Date.now()}`;
    const mockSigningUrl = `https://app.opensignlabs.com/sign/${mockDocId}`;
    
    await storage.updateContract(contractId, {
      openSignDocumentId: mockDocId,
      openSignSigningUrl: mockSigningUrl,
      status: "sent",
    });
    
    return {
      success: true,
      documentId: mockDocId,
      signingUrl: mockSigningUrl,
    };
  }

  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const response = await fetch(`${OPENSIGN_API_URL}/api/v1/document`, {
      method: "POST",
      headers: {
        "x-api-token": OPENSIGN_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        document: pdfBase64,
        signers: signers.map((s, idx) => ({
          name: s.name,
          email: s.email,
          role: s.role || `Signer ${idx + 1}`,
        })),
        expiry_date: expiryDate.toISOString().split("T")[0],
        auto_reminder: true,
        remind_once_in_every: 3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[OpenSign] API error:", error);
      return { success: false, error: `OpenSign API error: ${response.status}` };
    }

    const data = await response.json();
    
    await storage.updateContract(contractId, {
      openSignDocumentId: data.document_id || data.id,
      openSignSigningUrl: data.signing_url || data.url,
      status: "sent",
    });

    return {
      success: true,
      documentId: data.document_id || data.id,
      signingUrl: data.signing_url || data.url,
    };
  } catch (error: any) {
    console.error("[OpenSign] Error creating document:", error);
    return { success: false, error: error.message };
  }
}

export async function getDocumentStatus(documentId: string): Promise<GetDocumentResponse> {
  if (!OPENSIGN_API_TOKEN) {
    console.warn("[OpenSign] API token not configured - returning mock status");
    return {
      success: true,
      status: "pending",
      certificateUrl: null as any,
    };
  }

  try {
    const response = await fetch(`${OPENSIGN_API_URL}/api/v1/document/${documentId}`, {
      headers: {
        "x-api-token": OPENSIGN_API_TOKEN,
      },
    });

    if (!response.ok) {
      return { success: false, error: `OpenSign API error: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      success: true,
      status: data.status,
      certificateUrl: data.certificate_url || data.certificateUrl,
      signedAt: data.signed_at || data.signedAt,
    };
  } catch (error: any) {
    console.error("[OpenSign] Error getting document:", error);
    return { success: false, error: error.message };
  }
}

export async function resendSigningEmail(documentId: string, recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  if (!OPENSIGN_API_TOKEN) {
    console.warn("[OpenSign] API token not configured - mock resend");
    return { success: true };
  }

  try {
    const response = await fetch(`${OPENSIGN_API_URL}/api/v1/document/resend`, {
      method: "POST",
      headers: {
        "x-api-token": OPENSIGN_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: documentId,
        recipient_email: recipientEmail,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `OpenSign API error: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[OpenSign] Error resending email:", error);
    return { success: false, error: error.message };
  }
}

export async function syncContractSigningStatus(contractId: string): Promise<{ success: boolean; signed: boolean; error?: string }> {
  const contract = await storage.getContract(contractId);
  if (!contract) {
    return { success: false, signed: false, error: "Contract not found" };
  }

  if (!contract.openSignDocumentId) {
    return { success: false, signed: false, error: "No OpenSign document linked" };
  }

  const result = await getDocumentStatus(contract.openSignDocumentId);
  if (!result.success) {
    return { success: false, signed: false, error: result.error };
  }

  const isSigned = result.status === "completed" || result.status === "signed";
  
  if (isSigned && contract.status !== "signed") {
    await storage.updateContract(contractId, {
      status: "signed",
      signedAt: result.signedAt ? new Date(result.signedAt) : new Date(),
      openSignCertificateUrl: result.certificateUrl || null,
    });
  }

  return { success: true, signed: isSigned };
}

interface ContractServiceItem {
  clientType: string;
  qty: number;
  service: string;
  price: number;
  total: number;
}

interface ContractPdfOptions {
  artistName: string;
  clientName: string;
  packageDetails: string;
  totalAmount: number;
  depositAmount: number;
  eventDate: string;
  serviceType: string;
  additionalTerms?: string;
  businessName?: string;
  eventLocation?: string;
  serviceItems?: ContractServiceItem[];
  eventDates?: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  clientContact?: string;
  photographerInfo?: string;
  balanceDueDate?: string;
}

export function generateContractPdfHtml(
  artistName: string,
  clientName: string,
  packageDetails: string,
  totalAmount: number,
  depositAmount: number,
  eventDate: string,
  serviceType: string,
  additionalTerms?: string,
  businessName?: string,
  eventLocation?: string,
  options?: Partial<ContractPdfOptions>
): string {
  const formattedTotal = (totalAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const formattedDeposit = (depositAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const formattedBalance = ((totalAmount - depositAmount) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const contractDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const displayBusinessName = businessName || artistName;
  
  const serviceItems = options?.serviceItems || [];
  const displayEventDates = options?.eventDates || eventDate;
  const startTime = options?.serviceStartTime || "TBD";
  const endTime = options?.serviceEndTime || "TBD";
  const clientContact = options?.clientContact || "";
  const photographerInfo = options?.photographerInfo || "";
  const balanceDueDate = options?.balanceDueDate || "Two weeks before wedding date";

  const serviceItemsHtml = serviceItems.length > 0
    ? serviceItems.map(item => `
        <tr>
          <td>${item.clientType}</td>
          <td style="text-align: center;">${item.qty}</td>
          <td>${item.service}</td>
          <td style="text-align: right;">$${(item.price / 100).toFixed(0)}</td>
          <td style="text-align: right;">$${(item.total / 100).toFixed(0)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5">${packageDetails || serviceType}</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 12px; }
    h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
    .business-name { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 20px; }
    .contract-intro { margin: 20px 0; }
    h2 { font-size: 12px; font-weight: bold; margin-top: 15px; margin-bottom: 8px; }
    .section { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    td, th { padding: 8px; border: 1px solid #999; text-align: left; font-size: 11px; }
    th { background: #f0f0f0; font-weight: bold; }
    .signature-section { margin-top: 40px; }
    .signature-line { border-bottom: 1px solid #333; width: 250px; margin-bottom: 5px; }
    .signature-block { display: inline-block; width: 45%; vertical-align: top; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <div class="contract-intro">
    <p>This service contract is entered into as of <strong>${contractDate}</strong> between <strong>${clientName}</strong> (Client) and <strong>${displayBusinessName}</strong> (Artist). The Client and the Artist agree as follows:</p>
  </div>

  <h2>1. SERVICE TO BE PROVIDED</h2>
  <div class="section">
    <p>Artist will provide services to client as specified in Attachment A.</p>
  </div>

  <h2>2. LOCATION OF SERVICE</h2>
  <div class="section">
    <p>The service will take place at the following location: <strong>${eventLocation || 'TBD'}</strong></p>
  </div>

  <h2>3. DATE AND TIME OF SERVICE</h2>
  <div class="section">
    <p>The date of Service: <strong>${displayEventDates}</strong><br>
    Service Begins: ${startTime} (We will arrive a few minutes early to set up)<br>
    Service Completion: ${endTime}</p>
  </div>

  <h2>4. PARKING</h2>
  <div class="section">
    <p>Valet parking is required for all hotel getting ready locations. The amount of equipment required for day of services is extensive and to ensure ease for the artist and timely arrival, valet parking will be charged to the room at the time of arrival.</p>
  </div>

  <h2>5. PAYMENT</h2>
  <div class="section">
    <p>In full consideration for all services rendered by Artist at the location, the Client agrees to make deposit and payment in U.S. funds to the Artist, as provided in Attachment A.</p>
  </div>

  <h2>6. CANCELLATION</h2>
  <div class="section">
    <p>Cancellations can be made 30 days prior to the event without penalty other than loss of the retainer amount. In case of cancellations less than two calendar weeks retainer and final payment will not be refunded. The retainer is non refundable.<br><br>
    The Artist's obligation is to give services as provided in Attachment A. If Artist is unavailable as a result of sickness, accidents, acts of God or other reasons beyond the Artist's control, artist will make all commercially reasonable efforts to arrange for comparable services agreed upon within this contract.</p>
  </div>

  <h2>7. MISCELLANEOUS</h2>
  <div class="section">
    <p>The service contract and specified attachments set forth the entire agreement between the Artist and Client, and may not be amended except in writing signed by both parties. This service contract will be governed by and construed in accordance with the laws of the State of California.</p>
  </div>

  <div class="signature-section">
    <table style="border: none;">
      <tr>
        <td style="border: none; width: 50%; vertical-align: top;">
          <p style="margin-bottom: 30px;">/sig1/</p>
          <p style="margin: 0; font-size: 10px;">(${clientName}, Client) /date1/</p>
        </td>
        <td style="border: none; width: 50%; vertical-align: top;">
          <p style="margin-bottom: 30px;">&nbsp;</p>
          <p style="margin: 0; font-size: 10px;">(${artistName}, Artist) (${contractDate})</p>
        </td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>
  
  <h2 style="text-align: center; margin-top: 20px;">Attachment A</h2>
  
  <table>
    <tr>
      <th>Client</th>
      <th style="text-align: center;">QTY</th>
      <th>Service</th>
      <th style="text-align: right;">Price</th>
      <th style="text-align: right;">Total</th>
    </tr>
    ${serviceItemsHtml}
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold;">Total</td>
      <td style="text-align: right; font-weight: bold;">${formattedTotal}</td>
    </tr>
  </table>

  <div style="margin-top: 30px;">
    <p><strong>Client Contact:</strong> ${clientContact}</p>
    <p><strong>Photographer:</strong> ${photographerInfo}</p>
  </div>

  <div style="margin-top: 20px;">
    <p><strong>Payment:</strong></p>
    <p>A Square invoice will be sent for payment.</p>
    
    <ul style="margin-top: 15px;">
      <li>Retainer amount is to hold the date. <strong>${formattedDeposit}</strong> - No date is guaranteed without the signed contract and retainer amount. Retainer is non refundable and required at the same time.</li>
      <li>Payment of Balance: ${balanceDueDate} the Client will pay the Artist the remaining balance of <strong>${formattedBalance}</strong></li>
    </ul>
  </div>

  <div class="footer">
    <p style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 15px;">This contract was created through Your Private Secretary.</p>
  </div>
</body>
</html>
  `.trim();
}
