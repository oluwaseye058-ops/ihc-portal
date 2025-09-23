// ✅ Load environment variables first
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // ✅ For password hashing

const sendBookingNotification = require("./mailer"); // mailer
const User = require("./models/user");

// 👉 Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// 👉 Mount auth routes
const authRoutes = require("./routes/auth")(sendBookingNotification);
app.use("/api/auth", authRoutes);

const invoiceRoutes = require("./invoice")(sendBookingNotification);
app.use("/api/invoice", invoiceRoutes);

// 👉 Debug print env
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("SMTP_HOST:", process.env.SMTP_HOST);

// 👉 Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in .env or Render env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 👉 Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

/**
 * Registration endpoint
 */
app.post("/api/register", async (req, res) => {
  try {
    const { firstName, middleName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const fullName = `${firstName} ${middleName || ""} ${lastName}`.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      paymentStatus: "pending",
    });

    await user.save();
    console.log("✅ New registration:", user);

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

    res.json({ success: true, userId: user._id, token });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

/**
 * Get current user (me)
 */
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("❌ /me error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

/**
 * Status check (Step 2 portal)
 */
app.get("/api/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

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

/**
 * Payment update (Step 4)
 */
app.post("/api/payment/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { method } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (method && method !== "card") user.paymentStatus = "confirmed";
    await user.save();

    console.log("💳 Payment update:", user);

    if (user.paymentStatus === "confirmed") {
      try {
        await sendBookingNotification(
          user.email,
          "Payment Confirmation – IHC",
          `<p>Dear ${user.fullName},</p><p>Your payment has been confirmed. Your IHC code will be assigned shortly.</p>`
        );
      } catch (err) {
        console.error("❌ Error sending payment email:", err.message);
      }
    }

    res.json({ success: true, paymentStatus: user.paymentStatus });
  } catch (err) {
    console.error("❌ Payment error:", err);
    res.status(500).json({ error: "Server error during payment update" });
  }
});

// 👉 Import booking routes
const bookingRoutes = require("./routes/booking");
app.use("/api/booking", bookingRoutes(sendBookingNotification));

// 👉 Test route
app.get("/", (req, res) => {
  res.send("IHC Backend Running 🚀");
});

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
