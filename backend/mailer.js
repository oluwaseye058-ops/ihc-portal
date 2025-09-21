// backend/mailer.js
const nodemailer = require("nodemailer");

// ✅ Only load .env locally, never in production
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,             // e.g., smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                           // Brevo requires STARTTLS (false for 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ Debug log to confirm env vars (never show real pass)
console.log("🔎 Using SMTP config:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? "***" : "MISSING"
});

async function sendBookingNotification(to, subject, htmlBody) {
  if (!to) {
    console.error("❌ No recipient email provided!");
    throw new Error("Recipient email is required");
  }

  const mailOptions = {
    from: `"IHC Portal" <admin@ihc-bh.com>`, // ✅ Brevo user or verified domain
    replyTo: "admin@ihc-bh.com",
    to,
    subject,
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId, "to:", to);
    return info;
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    throw err;
  }
}

module.exports = sendBookingNotification;
