const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");

module.exports = function (sendEmail) {
  const router = express.Router();

  // ✅ Middleware to protect routes
  function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id: user._id }
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  // ✅ Register (with password)
  router.post("/register", async (req, res) => {
    try {
      const { fullName, email, password } = req.body;
      if (!fullName || !email || !password) {
        return res.status(400).json({ error: "All fields required" });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const newUser = new User({ fullName, email, password });
      await newUser.save();

      res.json({ success: true, message: "Registration successful" });
    } catch (err) {
      console.error("❌ Register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Login
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        success: true,
        token,
        userId: user._id,
        fullName: user.fullName,
      });
    } catch (err) {
      console.error("❌ Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Forgot password
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "No account found" });

      const resetToken = crypto.randomBytes(20).toString("hex");
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

      await sendEmail(
        user.email,
        "IHC Password Reset",
        `
          <p>Hello ${user.fullName},</p>
          <p>Click the link below to reset your password (valid for 1 hour):</p>
          <a href="${resetLink}">${resetLink}</a>
        `
      );

      res.json({ success: true, message: "Password reset link sent" });
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Reset password
  router.post("/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });
      if (!user) return res.status(400).json({ error: "Invalid or expired token" });

      user.password = newPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.json({ success: true, message: "Password reset successful" });
    } catch (err) {
      console.error("❌ Reset password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Get current user profile
  router.get("/me", authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password -resetToken -resetTokenExpiry");
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({ success: true, user });
    } catch (err) {
      console.error("❌ Profile fetch error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};
