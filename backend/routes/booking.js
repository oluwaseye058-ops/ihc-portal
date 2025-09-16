const express = require("express");
const router = express.Router();

// Temporary in-memory booking store
let bookings = [];

// POST /api/booking/:userId → create new booking
router.post("/:userId", (req, res) => {
  const { userId } = req.params;
  const booking = req.body;

  if (!booking.firstName || !booking.lastName || !booking.bookingDate || !booking.timeSlot) {
    return res.status(400).json({ success: false, message: "Missing required booking fields" });
  }

  // Add booking ID + user link
  booking.bookingId = "BK" + Math.floor(1000 + Math.random() * 9000);
  booking.userId = userId;

  // Save booking
  bookings.push(booking);

  console.log("📅 New booking received for user:", userId, booking);

  res.json({ success: true, booking });
});

// GET /api/booking/:userId → fetch all bookings for a user
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const userBookings = bookings.filter(b => b.userId === userId);

  res.json({ success: true, bookings: userBookings });
});

module.exports = router;