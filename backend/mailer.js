const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g., "ihc-bh.com"
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,                       // true for SSL (port 465)
  auth: {
    user: process.env.SMTP_USER,      // your SMTP username/email
    pass: process.env.SMTP_PASS       // your SMTP password
  }
});

async function sendBookingNotification(to, subject, htmlBody) {
  const mailOptions = {
    from: `"IHC Portal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlBody
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err;
  }
}

module.exports = sendBookingNotification;
