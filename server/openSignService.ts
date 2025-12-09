import { storage } from "./storage";

const OPENSIGN_API_URL = process.env.OPENSIGN_API_URL || "https://api.opensignlabs.com";
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

export function generateContractPdfHtml(
  artistName: string,
  clientName: string,
  packageDetails: string,
  totalAmount: number,
  depositAmount: number,
  eventDate: string,
  serviceType: string,
  additionalTerms?: string
): string {
  const formattedTotal = (totalAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const formattedDeposit = (depositAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #A8929C; text-align: center; margin-bottom: 30px; font-size: 28px; }
    h2 { color: #6B5A50; border-bottom: 2px solid #A8929C; padding-bottom: 10px; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #A8929C; }
    .section { margin: 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details-table td { padding: 12px; border: 1px solid #ddd; }
    .details-table td:first-child { font-weight: bold; width: 40%; background: #FAF8F5; }
    .terms { background: #F7F4EF; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .signature-section { margin-top: 50px; page-break-inside: avoid; }
    .signature-line { border-bottom: 1px solid #333; width: 300px; display: inline-block; margin: 40px 0 10px 0; }
    .signature-label { font-size: 14px; color: #666; }
    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Beauty Services Contract</h1>
    <p style="color: #A8929C; font-style: italic;">Agreement for Professional Beauty Services</p>
  </div>

  <div class="section">
    <p>This Contract is entered into as of <strong>${today}</strong> by and between:</p>
    <table class="details-table">
      <tr><td>Service Provider (Artist)</td><td>${artistName}</td></tr>
      <tr><td>Client</td><td>${clientName}</td></tr>
      <tr><td>Event Date</td><td>${eventDate}</td></tr>
      <tr><td>Service Type</td><td>${serviceType}</td></tr>
    </table>
  </div>

  <h2>Services & Package Details</h2>
  <div class="section">
    <p>${packageDetails}</p>
  </div>

  <h2>Payment Terms</h2>
  <table class="details-table">
    <tr><td>Total Amount</td><td>${formattedTotal}</td></tr>
    <tr><td>Deposit Required</td><td>${formattedDeposit}</td></tr>
    <tr><td>Balance Due</td><td>${((totalAmount - depositAmount) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</td></tr>
    <tr><td>Payment Schedule</td><td>Deposit due upon signing. Balance due 7 days before event date.</td></tr>
  </table>

  <h2>Terms & Conditions</h2>
  <div class="terms">
    <p><strong>Cancellation Policy:</strong> Deposit is non-refundable. Cancellations within 30 days of event date forfeit full payment.</p>
    <p><strong>Rescheduling:</strong> One reschedule permitted with 14+ days notice, subject to availability.</p>
    <p><strong>Late Fees:</strong> Late payments incur a 5% fee per week.</p>
    <p><strong>Travel:</strong> Travel fees may apply for locations beyond 25 miles from artist's base.</p>
    ${additionalTerms ? `<p><strong>Additional Terms:</strong> ${additionalTerms}</p>` : ""}
  </div>

  <div class="signature-section">
    <h2>Signatures</h2>
    <p>By signing below, both parties agree to the terms and conditions outlined in this contract.</p>
    
    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Service Provider Signature</div>
        <div class="signature-label">${artistName}</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Client Signature</div>
        <div class="signature-label">${clientName}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This contract was generated through the Beauvette platform.</p>
    <p>Document Date: ${today}</p>
  </div>
</body>
</html>
  `.trim();
}
