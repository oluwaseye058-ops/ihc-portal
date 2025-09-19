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
    user: process.env.SMTP_USER,           // Brevo SMTP login
    pass: process.env.SMTP_PASS            // Brevo SMTP key
  }
});

// ✅ Debug log to confirm environment variables on Render
console.log("🔎 Using SMTP config:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? "***" : "MISSING"
});

async function sendBookingNotification(to, subject, htmlBody) {
  const mailOptions = {
    from: `"IHC Portal" <${process.env.SMTP_USER}>`, // ✅ must match Brevo user unless domain is verified
    replyTo: "admin@ihc-bh.com",                     // ✅ your custom identity
    to,
    subject,
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
    throw err;
  }
}

module.exports = sendBookingNotification;
