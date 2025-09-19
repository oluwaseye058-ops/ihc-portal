const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,             // e.g., smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                           // Brevo requires STARTTLS (false for 587)
  auth: {
    user: process.env.SMTP_USER,           // Brevo SMTP login
    pass: process.env.SMTP_PASS            // Brevo SMTP key
  }
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
