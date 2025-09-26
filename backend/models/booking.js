
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    middleName: { type: String }, // optional
    lastName: { type: String, required: true },
    email: { type: String, required: true }, // from User model
    passportNumber: { type: String, required: true },
    nationality: { type: String, required: true },
    dob: { type: String, required: true },
    address: { type: String, required: true },
    sponsorCompany: { type: String, required: true },
    sponsorAirline: { type: String, required: true },
    bookingDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    bookingStatus: { type: String, default: "pendingApproval" },
    paymentMethod: { type: String },
    paymentStatus: { type: String, default: "pending" },
    ihcCode: { type: String },
    invoiceUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);