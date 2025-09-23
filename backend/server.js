const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config(); // ✅ load env variables

const sendBookingNotification = require("./mailer"); // ✅ mailer
const User = require("./models/user");

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Connect to MongoDB
console.log("MONGODB_URI:", process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 👉 Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// 👉 Import auth routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes(sendBookingNotification));

/**
 * Registration endpoint
 * - If email exists: returns userId + existing flag (redirect to portal)
 * - If new: creates user and returns userId
 */
app.post("/api/register", async (req, res) => {
  try {
    const { firstName, middleName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // ✅ Existing user: return userId and existing=true
      return res.json({ success: true, userId: existingUser._id, existing: true });
    }

    const fullName = `${firstName} ${middleName || ""} ${lastName}`.trim();

    const newUser = new User({
      fullName,
      email,
      paymentStatus: "pending",
      password: "changeme123", // ⚠️ TEMP placeholder until proper password
    });

    await newUser.save();
    console.log("✅ New registration:", newUser);

    res.json({ success: true, userId: newUser._id });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

/**
 * Status check (Step 2 portal)
 */
app.get("/api/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If payment is confirmed, assign IHC code if not already assigned
    if (user.paymentStatus === "confirmed" && !user.ihcCode) {
      user.ihcCode =
        "IHC" + Math.random().toString(36).substring(2, 8).toUpperCase();
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
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (method && method !== "card") {
      user.paymentStatus = "confirmed";
    }
    await user.save();

    console.log("💳 Payment update:", user);

    // ✅ Send email notification
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

    res.json({
      success: true,
      paymentStatus: user.paymentStatus,
    });
  } catch (err) {
    console.error("❌ Payment error:", err);
    res.status(500).json({ error: "Server error during payment update" });
  }
});

// 👉 Import booking routes (pass mailer if needed)
const bookingRoutes = require("./routes/booking");
app.use("/api/booking", bookingRoutes(sendBookingNotification));

// 👉 Test route
app.get("/", (req, res) => {
  res.send("IHC Backend Running 🚀");
});

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
