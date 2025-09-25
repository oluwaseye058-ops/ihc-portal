const jwt = require("jsonwebtoken");
const express = require("express");
const User = require("../models/user");
const Booking = require("../models/booking");
const crypto = require("crypto");

module.exports = function (sendBookingNotification) {
  const router = express.Router();

  // Middleware to verify JWT
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id: user._id }
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  };

  // Middleware for staff-only routes
  const staffMiddleware = (req, res, next) => {
    // Assuming User model has a role field (e.g., 'staff' or 'admin')
    User.findById(req.user.id)
      .then(user => {
        if (!user || user.role !== "staff") {
          return res.status(403).json({ success: false, message: "Staff access required" });
        }
        next();
      })
      .catch(err => {
        console.error("❌ Staff auth error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
      });
  };

  // POST /api/booking/:userId → create new booking
  router.post("/:userId", authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const bookingData = req.body;

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "passportNumber",
      "nationality",
      "dob",
      "address",
      "sponsorCompany",
      "sponsorAirline",
      "bookingDate",
      "timeSlot",
    ];
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      if (req.user.id !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      const bookingId = "BK" + crypto.randomBytes(4).toString("hex").toUpperCase();
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
        if (!process.env.STAFF_EMAIL) {
          console.warn("⚠️ STAFF_EMAIL not set");
        }
        await sendBookingNotification(
          process.env.STAFF_EMAIL || "staff@ihc-portal.com",
          `New IHC Booking: ${booking.bookingId}`,
          `<p>A new IHC booking has been submitted:</p>
           <ul>
             <li><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</li>
             <li><strong>Email:</strong> ${booking.email}</li>
             <li><strong>Booking ID:</strong> ${booking.bookingId}</li>
           </ul>
           <p>Please review and approve the booking in the portal.</p>`
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
  router.post("/:userId/paymentMethod", authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod, booking } = req.body;

    if (!paymentMethod || !booking?.bookingId) {
      return res.status(400).json({ success: false, message: "Missing payment method or bookingId" });
    }

    try {
      const userBooking = await Booking.findOne({ userId, bookingId: booking.bookingId });
      if (!userBooking) return res.status(404).json({ success: false, message: "Booking not found" });

      if (req.user.id !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      userBooking.paymentMethod = paymentMethod;
      userBooking.bookingStatus = "pendingApproval";
      await userBooking.save();

      console.log("💳 Payment method updated in DB:", userBooking);

      // Notify staff
      try {
        if (!process.env.STAFF_EMAIL) {
          console.warn("⚠️ STAFF_EMAIL not set");
        }
        await sendBookingNotification(
          process.env.STAFF_EMAIL || "staff@ihc-portal.com",
          `Payment Method Submitted: ${userBooking.bookingId}`,
          `<p>A candidate has submitted a booking with payment details:</p>
           <ul>
             <li><strong>Name:</strong> ${userBooking.firstName} ${userBooking.middleName || ""} ${userBooking.lastName}</li>
             <li><strong>Email:</strong> ${userBooking.email}</li>
             <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
             <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
           </ul>
           <p>Please review and approve this booking in the portal to generate invoice.</p>`
        );
        console.log("📧 Staff notified via email (payment stage)");
      } catch (err) {
        console.error("❌ Error sending staff email:", err.message);
      }

      // Notify candidate
      try {
        if (!process.env.FRONTEND_URL) {
          console.warn("⚠️ FRONTEND_URL not set");
        }
        const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";
        await sendBookingNotification(
          userBooking.email,
          "IHC Booking Request Received",
          `<p>Dear ${userBooking.firstName},</p>
           <p>Your booking request has been received by IHC staff. Please wait for approval before proceeding with payment.</p>
           <p><strong>Booking Details:</strong></p>
           <ul>
             <li><strong>Appointment:</strong> ${userBooking.bookingDate} at ${userBooking.timeSlot}</li>
             <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
             <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
           </ul>
           <p>Once your booking is approved, you will be able to download your invoice.</p>
           <p>
             <a href="${frontendUrl}/step2.html" style="display:inline-block;padding:12px 24px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Go to Your Portal</a>
           </p>
           <p>Thank you,<br>IHC Team</p>`
        );
        console.log("📧 Candidate notified (payment stage)");
      } catch (err) {
        console.error("❌ Error sending candidate email:", err.message);
      }

      res.json({ success: true, booking: userBooking });
    } catch (err) {
      console.error("❌ Error updating payment method:", err.message);
      res.status(500).json({ success: false, message: "Server error updating payment method" });
    }
  });

  // PUT /api/booking/:bookingId/confirmPayment → mark paid + issue IHC code
  router.put("/:bookingId/confirmPayment", authMiddleware, staffMiddleware, async (req, res) => {
    try {
      const { bookingId } = req.params;

      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      // Update payment status
      booking.paymentStatus = "confirmed";

      // Only generate IHC code if it doesn't exist
      if (!booking.ihcCode || booking.ihcCode.trim() === "") {
        booking.ihcCode = "IHC" + crypto.randomBytes(4).toString("hex").toUpperCase();
        console.log(`💰 New IHC Code generated: ${booking.ihcCode}`);
      } else {
        console.log(`ℹ️ Reusing existing IHC Code: ${booking.ihcCode}`);
      }

      await booking.save();

      // Notify candidate
      try {
        if (!process.env.FRONTEND_URL) {
          console.warn("⚠️ FRONTEND_URL not set");
        }
        const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";
        await sendBookingNotification(
          booking.email,
          "IHC Payment Confirmed – Your IHC Code",
          `<p>Dear ${booking.firstName},</p>
           <p>Your payment for booking <strong>${booking.bookingId}</strong> has been confirmed.</p>
           <p>Your unique IHC Code is: <strong>${booking.ihcCode}</strong></p>
           <p>You may download your confirmation letter from your portal.</p>
           <p>
             <a href="${frontendUrl}/step5.html?bookingId=${booking.bookingId}" style="display:inline-block;padding:12px 24px;background-color:#17a2b8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Confirmation</a>
           </p>
           <p>Thank you,<br>IHC Team</p>`
        );
        console.log(`📧 Payment confirmation email sent to ${booking.email}`);
      } catch (err) {
        console.error("❌ Error sending candidate email:", err.message);
      }

      res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ Error confirming payment:", err.message);
      res.status(500).json({ success: false, message: "Server error confirming payment" });
    }
  });

  // GET /api/booking/:userId → fetch user bookings
  router.get("/:userId", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.id !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      const bookings = await Booking.find({ userId }).select("-__v");
      res.json({ success: true, bookings });
    } catch (err) {
      console.error("❌ Fetch bookings error:", err.message);
      res.status(500).json({ success: false, message: "Server error fetching bookings" });
    }
  });

  return router;
};
