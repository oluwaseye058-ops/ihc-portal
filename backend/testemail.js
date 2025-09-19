// backend/smtp-test.js
const nodemailer = require("nodemailer");
require("dotenv").config();

async function testSMTP() {
  console.log("🔄 Testing SMTP connection...");

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // use STARTTLS on 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful. Ready to send emails.");
  } catch (err) {
    console.error("❌ SMTP connection failed:", err.message);
  }
}

testSMTP();
