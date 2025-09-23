// backend/models/booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    middleName: { type: String }, // ✅ optional
    lastName: { type: String, required: true },
    email: { type: String, required: true }, // from User model

    passport: { type: String },
    nationality: { type: String },
    dob: { type: String },
    address: { type: String },
    sponsorCompany: { type: String },
    sponsorAirline: { type: String },

    bookingDate: { type: String, required: true },
    timeSlot: { type: String, required: true },

    bookingStatus: { type: String, default: "pendingApproval" },
    paymentMethod: { type: String },

    invoiceUrl: { type: String }, // ✅ staff can add later
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
