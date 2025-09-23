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

    if (
      !bookingData.firstName ||
      !bookingData.lastName ||
      !bookingData.bookingDate ||
      !bookingData.timeSlot
    ) {
      return res.status(400).json({ success: false, message: "Missing required booking fields" });
    }

    try {
      // ✅ Fetch user from DB
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // ✅ Create booking doc
      const bookingId = "BK" + Math.floor(1000 + Math.random() * 9000);
      const booking = new Booking({
        ...bookingData,
        userId,
        bookingId,
        bookingStatus: "pendingApproval",
        email: user.email,
      });

      await booking.save();
      console.log("📅 New booking saved in DB:", booking);

      // ✅ Notify staff
      try {
        await sendBookingNotification(
          process.env.STAFF_EMAIL,
          `New IHC Booking: ${booking.bookingId}`,
          `
            <p>A new IHC booking has been submitted:</p>
            <ul>
              <li><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</li>
              <li><strong>Email:</strong> ${booking.email}</li>
              <li><strong>Passport:</strong> ${booking.passportNumber}</li>
              <li><strong>Nationality:</strong> ${booking.nationality}</li>
              <li><strong>DOB:</strong> ${booking.dob}</li>
              <li><strong>Address:</strong> ${booking.address}</li>
              <li><strong>Sponsor Company:</strong> ${booking.sponsorCompany}</li>
              <li><strong>Sponsor Airline:</strong> ${booking.sponsorAirline}</li>
              <li><strong>Appointment:</strong> ${booking.bookingDate} at ${booking.timeSlot}</li>
              <li><strong>Booking ID:</strong> ${booking.bookingId}</li>
              <li><strong>User ID:</strong> ${userId}</li>
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

  // ✅ Save payment method + send emails
  router.post("/:userId/paymentMethod", async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod, booking } = req.body;

    if (!paymentMethod || !booking?.bookingId) {
      return res.status(400).json({ success: false, message: "Missing payment method or bookingId" });
    }

    try {
      const userBooking = await Booking.findOne({ userId, bookingId: booking.bookingId });
      if (!userBooking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      userBooking.paymentMethod = paymentMethod;
      userBooking.bookingStatus = "pendingApproval";
      await userBooking.save();

      console.log("💳 Payment method updated in DB:", userBooking);

      // ✅ Notify staff
      await sendBookingNotification(
        process.env.STAFF_EMAIL,
        `Payment Method Submitted: ${userBooking.bookingId}`,
        `
          <p>A candidate has submitted a booking with payment details:</p>
          <ul>
            <li><strong>Name:</strong> ${userBooking.firstName} ${userBooking.middleName || ""} ${userBooking.lastName}</li>
            <li><strong>Email:</strong> ${userBooking.email}</li>
            <li><strong>Passport:</strong> ${userBooking.passportNumber}</li>
            <li><strong>Nationality:</strong> ${userBooking.nationality}</li>
            <li><strong>DOB:</strong> ${userBooking.dob}</li>
            <li><strong>Address:</strong> ${userBooking.address}</li>
            <li><strong>Sponsor Company:</strong> ${userBooking.sponsorCompany}</li>
            <li><strong>Sponsor Airline:</strong> ${userBooking.sponsorAirline}</li>
            <li><strong>Appointment:</strong> ${userBooking.bookingDate} at ${userBooking.timeSlot}</li>
            <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
            <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
          </ul>
          <p>Please review and approve this booking in the portal to generate invoice.</p>
        `
      );

      // ✅ Notify candidate
      if (userBooking.email) {
        const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal.onrender.com";
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

  // GET /api/booking/:userId → fetch all bookings for a user
  router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const userBookings = await Booking.find({ userId });
      res.json({ success: true, bookings: userBookings });
    } catch (err) {
      console.error("❌ Error fetching bookings:", err.message);
      res.status(500).json({ success: false, message: "Server error fetching bookings" });
    }
  });

  return router;
};
