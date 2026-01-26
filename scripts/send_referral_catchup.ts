import { sendEmail, sendInquiryNotificationEmail } from "../server/emailService";

const referrals = [
  { name: "Jaimie Thomas", email: "jaimiemthomas@gmail.com", clientToken: "c3cd181b-1066-4bf8-ae89-1b28d6612a28", threadToken: "05926ffa-ed50-407e-bb1e-de77eb0214da", date: "October 17, 2026" },
  { name: "Yona Koch-Fienberg", email: "ykochfie@gmail.com", clientToken: "3b263d3e-d957-4345-8e6f-5208d65bc8be", threadToken: "c88d067e-314d-4242-b5e5-71fb3a7d8165", date: "May 16, 2026" },
  { name: "Adri Molina", email: "adrimimolina@gmail.com", clientToken: "b777b728-2f16-4914-a49e-ff8149cce2bf", threadToken: "e26cfdcf-c437-4f7a-b747-104077af2540", date: "February 13, 2026" },
  { name: "Diana Ponce", email: "dianaponce2000@gmail.com", clientToken: "0f00a523-5468-404b-bb52-44dab7a840e0", threadToken: "e0215b32-cc05-407b-8690-2395db4a3281", date: "March 12, 2026" },
  { name: "Rebekah Zeleny", email: "bbzelezny@yahoo.com", clientToken: "6e1d50cb-37fa-441a-818f-5d9d56b6441c", threadToken: "36e2bd04-52c7-4aa5-bc8a-3b3f463fb2b1", date: "August 29, 2026" },
  { name: "Nausheen Sheikh", email: "sheikhelzein@gmail.com", clientToken: "7e1ac093-9837-4316-bb4e-64666cd55bb2", threadToken: "8b255bd9-b5ee-42b9-a586-44eda2caabf9", date: "February 18, 2026" },
  { name: "Angela Bottarini", email: "ambottarini@gmail.com", clientToken: "0ed89e40-99cd-4f12-9776-4a659db2c390", threadToken: "a0faac39-0a89-4d18-b104-8acbdcb30e39", date: "October 24, 2026" }
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
