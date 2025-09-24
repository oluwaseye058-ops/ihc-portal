// backend/routes/booking.js
const express = require("express");
const User = require("../models/user");
const Booking = require("../models/booking"); // ✅ MongoDB model

module.exports = function (sendBookingNotification) {
  const router = express.Router();

  // POST /api/booking/:userId → create new booking
  router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const bookingData = req.body;

    if (!bookingData.firstName || !bookingData.lastName || !bookingData.bookingDate || !bookingData.timeSlot) {
      return res.status(400).json({ success: false, message: "Missing required booking fields" });
    }

    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const bookingId = "BK" + Math.floor(1000 + Math.random() * 9000);
      const booking = new Booking({
        ...bookingData,
        userId,
        bookingId,
        bookingStatus: "pendingApproval",
        email: user.email,
      });

      await booking.save();
      console.log("📅 New booking saved:", booking);

      // Notify staff
      try {
        await sendBookingNotification(
          process.env.STAFF_EMAIL,
          `New IHC Booking: ${booking.bookingId}`,
          `
            <p>A new IHC booking has been submitted:</p>
            <ul>
              <li><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</li>
              <li><strong>Email:</strong> ${booking.email}</li>
              <li><strong>Booking ID:</strong> ${booking.bookingId}</li>
            </ul>
            <p>Please review and approve the booking in the portal.</p>
          `
        );
        console.log("📧 Staff notified via email (initial booking)");
      } catch (err) {
        console.error("❌ Error sending staff email:", err.message);
      }

      res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ Error creating booking:", err.message);
      res.status(500).json({ success: false, message: "Server error creating booking" });
    }
  });

  // POST /api/booking/:userId/paymentMethod → save payment method
  router.post("/:userId/paymentMethod", async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod, booking } = req.body;

    if (!paymentMethod || !booking?.bookingId) {
      return res.status(400).json({ success: false, message: "Missing payment method or bookingId" });
    }

    try {
      const userBooking = await Booking.findOne({ userId, bookingId: booking.bookingId });
      if (!userBooking) return res.status(404).json({ success: false, message: "Booking not found" });

      userBooking.paymentMethod = paymentMethod;
      userBooking.bookingStatus = "pendingApproval";
      await userBooking.save();

      console.log("💳 Payment method updated in DB:", userBooking);

      // Notify staff
      await sendBookingNotification(
        process.env.STAFF_EMAIL,
        `Payment Method Submitted: ${userBooking.bookingId}`,
        `
          <p>A candidate has submitted a booking with payment details:</p>
          <ul>
            <li><strong>Name:</strong> ${userBooking.firstName} ${userBooking.middleName || ""} ${userBooking.lastName}</li>
            <li><strong>Email:</strong> ${userBooking.email}</li>
            <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
            <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
          </ul>
          <p>Please review and approve this booking in the portal to generate invoice.</p>
        `
      );

      // Notify candidate
      if (userBooking.email) {
        const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";
        await sendBookingNotification(
          userBooking.email,
          "IHC Booking Request Received",
          `
            <p>Dear ${userBooking.firstName},</p>
            <p>Your booking request has been received by IHC staff. Please wait for approval before proceeding with payment.</p>
            <p><strong>Booking Details:</strong></p>
            <ul>
              <li><strong>Appointment:</strong> ${userBooking.bookingDate} at ${userBooking.timeSlot}</li>
              <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
              <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
            </ul>
            <p>Once your booking is approved, you will be able to download your invoice.</p>
            <p>
              <a href="${frontendUrl}/step2.html"
                 style="display:inline-block;padding:12px 24px;background-color:#007bff;color:#ffffff;
                        text-decoration:none;border-radius:6px;font-weight:bold;">
                Go to Your Portal
              </a>
            </p>
            <p>Thank you,<br>IHC Team</p>
          `
        );
        console.log("📧 Candidate notified (payment stage)");
      }

      res.json({ success: true, booking: userBooking });
    } catch (err) {
      console.error("❌ Error updating payment method:", err.message);
      res.status(500).json({ success: false, message: "Server error updating payment method" });
    }
  });

// PUT /api/booking/:bookingId/confirmPayment → mark paid + issue IHC code
router.put("/:bookingId/confirmPayment", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Update payment status
    booking.paymentStatus = "confirmed";

    // ✅ Only generate IHC code if it doesn't exist
    if (!booking.ihcCode || booking.ihcCode.trim() === "") {
      booking.ihcCode = "IHC" + Math.floor(100000 + Math.random() * 900000);
      console.log(`💰 New IHC Code generated: ${booking.ihcCode}`);
    } else {
      console.log(`ℹ️ Reusing existing IHC Code: ${booking.ihcCode}`);
    }

    await booking.save();

    // Always send email to candidate
    if (booking.email) {
      const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";
      await sendBookingNotification(
        booking.email,
        "IHC Payment Confirmed – Your IHC Code",
        `
          <p>Dear ${booking.firstName},</p>
          <p>Your payment for booking <strong>${booking.bookingId}</strong> has been confirmed.</p>
          <p>Your unique IHC Code is: <strong>${booking.ihcCode}</strong></p>
          <p>You may download your confirmation letter from your portal.</p>
          <p>
            <a href="${frontendUrl}/step5.html?bookingId=${booking.bookingId}"
               style="display:inline-block;padding:12px 24px;background-color:#17a2b8;color:#ffffff;
                      text-decoration:none;border-radius:6px;font-weight:bold;">
              View Confirmation
            </a>
          </p>
          <p>Thank you,<br>IHC Team</p>
        `
      );
      console.log(`📧 Payment confirmation email sent to ${booking.email}`);
    }

    res.json({ success: true, booking });

  } catch (err) {
    console.error("❌ Error confirming payment:", err);
    res.status(500).json({ success: false, message: "Server error confirming payment" });
  }
});





  return router;
};
