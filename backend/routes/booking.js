// backend/routes/booking.js
const express = require("express");
const User = require("../models/user"); // ✅ get user info from DB

module.exports = function (sendBookingNotification) {
  const router = express.Router();

  // Temporary in-memory booking store
  let bookings = [];

  // POST /api/booking/:userId → create new booking
  router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const booking = req.body;

    if (!booking.firstName || !booking.lastName || !booking.bookingDate || !booking.timeSlot) {
      return res.status(400).json({ success: false, message: "Missing required booking fields" });
    }

    // ✅ Fetch user to ensure we have candidate email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Add booking details
    booking.bookingId = "BK" + Math.floor(1000 + Math.random() * 9000);
    booking.userId = userId;
    booking.bookingStatus = "pendingApproval";
    booking.email = user.email; // ✅ ensure candidate email is stored

    bookings.push(booking);

    console.log("📅 New booking received for user:", userId, booking);

    // ✅ Send staff email
    try {
      await sendBookingNotification(
        process.env.STAFF_EMAIL,
        `New IHC Booking: ${booking.bookingId}`,
        `
          <p>A new IHC booking has been submitted:</p>
          <ul>
            <li><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</li>
            <li><strong>Email:</strong> ${booking.email}</li>
            <li><strong>Passport:</strong> ${booking.passport}</li>
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
  });

  // ✅ Save payment method + send emails
  router.post("/:userId/paymentMethod", async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod, booking } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing payment method" });
    }

    const userBooking = bookings.find((b) => b.userId === userId && b.bookingId === booking.bookingId);
    if (!userBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    userBooking.paymentMethod = paymentMethod;
    userBooking.bookingStatus = "pendingApproval";

    console.log("💳 Payment method updated:", userBooking);

    try {
      // ✅ Notify staff
      await sendBookingNotification(
        process.env.STAFF_EMAIL,
        `Payment Method Submitted: ${userBooking.bookingId}`,
        `
          <p>A candidate has submitted a booking with payment details:</p>
          <ul>
            <li><strong>Name:</strong> ${userBooking.firstName} ${userBooking.middleName || ""} ${userBooking.lastName}</li>
            <li><strong>Email:</strong> ${userBooking.email}</li>
            <li><strong>Passport:</strong> ${userBooking.passport}</li>
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
              <a href="${process.env.FRONTEND_URL || "https://ihc-portal1.onrender.com"}/step2.html"
                 style="display:inline-block;padding:12px 24px;background-color:#007bff;color:#ffffff;
                        text-decoration:none;border-radius:6px;font-weight:bold;">
                Go to Your Portal
              </a>
            </p>
            <p>Thank you,<br>IHC Team</p>
          `
        );
        console.log("📧 Candidate notified (payment stage)");
      } else {
        console.error("❌ Candidate email missing, notification skipped");
      }
    } catch (err) {
      console.error("❌ Error sending payment emails:", err.message);
    }

    res.json({ success: true, booking: userBooking });
  });

  // GET /api/booking/:userId → fetch all bookings for a user
  router.get("/:userId", (req, res) => {
    const { userId } = req.params;
    const userBookings = bookings.filter((b) => b.userId === userId);

    res.json({ success: true, bookings: userBookings });
  });

  return router;
};
