const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const sendBookingNotification = require("./mailer");
const User = require("./models/user");

const app = express();

// ✅ CORS — relaxed for now so frontend can connect
app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Debug middleware: log requests
app.use((req, res, next) => {
  console.log("Request received:", {
    method: req.method,
    url: req.url,
    headers: { authorization: req.headers.authorization?.slice(0, 16) + "..." || "undefined" },
    origin: req.headers.origin,
  });
  next();
});

app.use(express.json());

// ✅ Routes
const authRoutes = require("./routes/auth")(sendBookingNotification);
app.use("/api/auth", authRoutes);

const invoiceRoutes = require("./invoice")(sendBookingNotification);
app.use("/api/invoice", invoiceRoutes);

const bookingRoutes = require("./routes/booking");
app.use("/api/booking", bookingRoutes(sendBookingNotification));

// ✅ Connection info logs
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Defined" : "Undefined");

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in .env or Render env");
  process.exit(1);
}

// ✅ MongoDB connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Auth check
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Auth: authMiddleware called", { authHeader: authHeader ? authHeader.slice(0, 16) + "..." : "undefined" });
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Auth: No token provided", { authHeader });
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Auth: Verifying token", { token: token.slice(0, 10) + "..." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("❌ /me error:", { error: err.message, token: req.headers.authorization?.slice(0, 16) + "..." });
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ✅ Payment status check
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

// ✅ Payment update
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

// ✅ Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.send("IHC Backend Running 🚀");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// ✅ Start server - if it works 
