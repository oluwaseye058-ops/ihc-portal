// backend/mailer.js
const SibApiV3Sdk = require("sib-api-v3-sdk");


// ✅ Load .env locally (Render injects them automatically in production)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Configure Brevo client
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY; // <-- set this in your Render env vars

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendBookingNotification(to, subject, htmlBody) {
  if (!to) {
    console.error("❌ No recipient email provided!");
    throw new Error("Recipient email is required");
  }

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = { name: "IHC Portal", email: "admin@ihc-bh.com" }; // must be a verified Brevo sender
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlBody;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent to ${to}, messageId:`, data.messageId || data);
    return data;
  } catch (err) {
    console.error("❌ Failed to send email via Brevo API:", err.message);
    throw err;
  }
}

module.exports = sendBookingNotification;
