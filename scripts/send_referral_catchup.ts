import { sendEmail, sendInquiryNotificationEmail } from "../server/emailService";

const referrals = [
  // SANITIZED: real client data removed before publication.
  // Restore from secure records if this one-off script must run again.
  { name: "EXAMPLE CLIENT", email: "client@example.com", clientToken: "00000000-0000-0000-0000-000000000000", threadToken: "00000000-0000-0000-0000-000000000000", date: "January 1, 2026" },
];

async function main() {
  for (let i = 0; i < referrals.length; i++) {
    const r = referrals[i];
    if (i > 0) await new Promise(res => setTimeout(res, 1500));
    
    // Send client apology email with chat link
    try {
      await sendEmail({
        to: r.email,
        subject: "Apology & Connect with Erika Marie Artistry",
        html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FAF8F5; color: #1A1A1A;">
          <h2 style="margin-bottom: 24px;">Our Sincere Apologies</h2>
          <p>Dear ${r.name},</p>
          <p>We sincerely apologize for the delay in connecting you with <strong>Erika Marie Artistry</strong>. Due to a technical error, the referral was not delivered properly.</p>
          <p>Erika Marie is an incredibly talented bridal artist recommended for your event on <strong>${r.date}</strong>.</p>
          <p style="margin: 24px 0;"><a href="https://dateinquiry.com/thread/${r.clientToken}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 4px;">Message Erika Marie</a></p>
          <p>We apologize for any inconvenience.</p>
          <p style="margin-top: 24px;">Warmly,<br>The Makeup Dolls</p>
        </div>`,
        fromName: "The Makeup Dolls"
      });
      console.log("Client sent:", r.name);
    } catch (err: any) {
      console.error("Client failed:", r.name, err.message);
    }
    
    await new Promise(res => setTimeout(res, 600));
    
    // Send Erika notification
    try {
      await sendInquiryNotificationEmail({
        toEmail: "Erikamarie.artistry@outlook.com",
        vendorName: "Erika Marie",
        clientName: r.name,
        clientEmail: r.email,
        eventDate: r.date,
        inquiryLink: "https://dateinquiry.com/inquiry/" + r.threadToken,
        isReferral: true,
        referredBy: "The Makeup Dolls"
      });
      console.log("Erika sent for:", r.name);
    } catch (err: any) {
      console.error("Erika failed:", r.name, err.message);
    }
  }
  console.log("All emails sent!");
}

main().catch(console.error);
