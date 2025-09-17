const express = require("express");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const nodemailer = require("nodemailer"); // ✅ add nodemailer
require("dotenv").config(); // ✅ load env variables

const app = express();
app.use(cors());

// Middleware
app.use(express.json());

// 👉 Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Temporary in-memory storage (replace with DB later)
let users = {};
let payments = {};

// 👉 Registration endpoint
app.post("/api/register", (req, res) => {
  const { firstName, middleName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const userId = crypto.randomBytes(4).toString("hex"); // unique ID
  users[userId] = {
    fullName: `${firstName} ${middleName || ""} ${lastName}`,
    email,
    paymentStatus: "pending",
    ihcCode: null,
  };

  console.log("✅ New registration:", users[userId]);

  res.json({ success: true, userId });
});

// 👉 Status check (Step 2 portal)
app.get("/api/status/:userId", (req, res) => {
  const { userId } = req.params;

  if (!users[userId]) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = users[userId];

  // If payment is confirmed, assign unique IHC code (once only)
  if (user.paymentStatus === "confirmed" && !user.ihcCode) {
    user.ihcCode = "IHC" + crypto.randomBytes(3).toString("hex").toUpperCase();
  }

  res.json({
    fullName: user.fullName,
    paymentStatus: user.paymentStatus,
    ihcCode: user.ihcCode || null,
  });
});

// 👉 Mock payment update (Step 4)
app.post("/api/payment/:userId", (req, res) => {
  const { userId } = req.params;
  const { method } = req.body;

  if (!users[userId]) {
    return res.status(404).json({ error: "User not found" });
  }

  // For now, all payments except "card" are auto-confirmed
  if (method && method !== "card") {
    users[userId].paymentStatus = "confirmed";
  }

  console.log("💳 Payment update:", users[userId]);

  res.json({
    success: true,
    paymentStatus: users[userId].paymentStatus,
  });
});

// 👉 Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or "smtp.mailgun.org", etc.
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Import booking routes and inject email logic
const bookingRoutes = require("./routes/booking");
app.use("/api/booking", bookingRoutes(transporter)); // ✅ pass transporter

// Test route
app.get("/", (req, res) => {
  res.send("IHC Backend Running 🚀");
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
