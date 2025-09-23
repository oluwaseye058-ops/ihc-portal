// backend/models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // ✅ add password
  paymentStatus: { type: String, default: "pending" },
  ihcCode: String,

  // ✅ for password reset
  resetToken: String,
  resetTokenExpiry: Date,
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
