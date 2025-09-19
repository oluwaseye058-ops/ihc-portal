// backend/server.js
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config(); // ✅ load env variables

// 👉 Connect to MongoDB
console.log("MONGODB_URI:", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 👉 Load User model
const User = require("./models/user");

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// 👉 Registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { firstName, middleName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

     // Check if email already exists
     const existingUser = await User.findOne({ email });
     if (existingUser) {
       return res.status(409).json({ error: "Email already registered" }); // 409 = Conflict
     }

    const fullName = `${firstName} ${middleName || ""} ${lastName}`.trim();

    const newUser = new User({
      fullName,
      email,
      paymentStatus: "pending",
    });

    await newUser.save();

    console.log("✅ New registration:", newUser);

    res.json({ success: true, userId: newUser._id });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// 👉 Status check (Step 2 portal)
app.get("/api/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If payment is confirmed, assign IHC code if not already assigned
    if (user.paymentStatus === "confirmed" && !user.ihcCode) {
      user.ihcCode = "IHC" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await user.save();
    }

    res.json({
      fullName: user.fullName,
      paymentStatus: user.paymentStatus,
      ihcCode: user.ihcCode || null,
    });
  } catch (err) {
    console.error("❌ Status error:", err);
    res.status(500).json({ error: "Server error during status check" });
  }
});

// 👉 Payment update (Step 4)
app.post("/api/payment/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { method } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // For now, all payments except "card" auto-confirm
    if (method && method !== "card") {
      user.paymentStatus = "confirmed";
    }
    await user.save();

    console.log("💳 Payment update:", user);

    res.json({
      success: true,
      paymentStatus: user.paymentStatus,
    });
  } catch (err) {
    console.error("❌ Payment error:", err);
    res.status(500).json({ error: "Server error during payment update" });
  }
});

// 👉 Nodemailer transporter (now fully env-based, no Gmail hardcoding)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,          // e.g. smtp.mailgun.org or smtp.sendgrid.net
  port: process.env.SMTP_PORT || 587,   // default to 587 if not set
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 👉 Import booking routes
const bookingRoutes = require("./routes/booking");
app.use("/api/booking", bookingRoutes(transporter));

// 👉 Test route
app.get("/", (req, res) => {
  res.send("IHC Backend Running 🚀");
});

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

