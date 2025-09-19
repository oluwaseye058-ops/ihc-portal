const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true, unique: true },
  paymentStatus: { type: String, default: "pending" },
  ihcCode: String,
});

module.exports = mongoose.model("User", userSchema);

