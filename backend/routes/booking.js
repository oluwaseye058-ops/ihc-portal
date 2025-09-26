// backend/routes/booking.js
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

  // 🔑 Simple password check for staff-only routes
  const staffMiddleware = (req, res, next) => {
    console.log("x-staff-key received:", req.headers["x-staff-key"]);
    const staffKey = req.headers["x-staff-key"];
    if (!staffKey || staffKey !== process.env.STAFF_SECRET) {
      return res.status(403).json({ success: false, message: "Forbidden: Invalid staff key" });
    }
    next();
  };

  // -----------------------
  // Create booking
  // POST /api/booking/:userId
  // -----------------------
  router.post("/:userId", authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const bookingData = req.body;

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

      // notify staff
      try {
        if (!process.env.STAFF_EMAIL) console.warn("⚠️ STAFF_EMAIL not set");
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

  // ----------------------------------
  // Candidate selects payment method
  // POST /api/booking/:userId/paymentMethod
  // ----------------------------------
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

      console.log("💳 Payment method updated:", userBooking);

      // notify staff
      try {
        if (!process.env.STAFF_EMAIL) console.warn("⚠️ STAFF_EMAIL not set");
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

      // notify candidate
      try {
        const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";
        await sendBookingNotification(
          userBooking.email,
          "IHC Booking Request Received",
          `<p>Dear ${userBooking.firstName},</p>
           <p>Your booking request has been received by IHC staff. Please wait for approval.</p>
           <p><strong>Booking Details:</strong></p>
           <ul>
             <li><strong>Appointment:</strong> ${userBooking.bookingDate} at ${userBooking.timeSlot}</li>
             <li><strong>Booking ID:</strong> ${userBooking.bookingId}</li>
             <li><strong>Payment Method:</strong> ${userBooking.paymentMethod}</li>
           </ul>
           <p>Once your booking is approved, you will be able to download your invoice.</p>
           <p>
             <a href="${frontendUrl}/step2.html" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Go to Your Portal</a>
           </p>`
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

  // ------------------------------------------------------------------
  // Staff confirms payment (marks paymentStatus = confirmed)
  // PUT /api/booking/:bookingId/confirmPayment
  // ------------------------------------------------------------------
  router.put("/:bookingId/confirmPayment", staffMiddleware, async (req, res) => {
    
    console.log("x-staff-key:", req.headers["x-staff-key"]);
console.log("bookingId from request:", req.params.bookingId);
console.log("invoiceUrl from request:", req.body.invoiceUrl);

    
    try {
      const { bookingId } = req.params;
      const booking = await Booking.findOne({ bookingId });
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

      booking.paymentStatus = "confirmed";
      await booking.save();
      console.log(`✅ Booking ${bookingId} approved by staff`);

      try {
        await sendBookingNotification(
          booking.email,
          "Your IHC Booking Has Been Approved",
          `<p>Dear ${booking.firstName},</p>
           <p>Your booking <strong>${booking.bookingId}</strong> has been approved by IHC staff.</p>
           <p>You can now log in to your portal to download the invoice and proceed with payment.</p>`
        );
      } catch (err) {
        console.error("❌ Failed to send approval email:", err.message);
      }

      res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ Error approving booking:", err.message);
      res.status(500).json({ success: false, message: "Server error approving booking" });
    }
  });

  // ------------------------------------------------------------------
  // Staff uploads invoice URL; marks booking approved and notifies candidate
  // PUT /api/booking/:bookingId/invoice
  // ------------------------------------------------------------------
  router.put("/:bookingId/invoice", staffMiddleware, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { invoiceUrl } = req.body;
      if (!invoiceUrl) return res.status(400).json({ success: false, message: "Invoice URL required" });

      // find booking and populate userId (ref to User)
      const booking = await Booking.findOne({ bookingId }).populate("userId", "email fullName");
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

      // update booking: set invoice and ensure it's approved
      booking.invoiceUrl = invoiceUrl;
      if (!booking.bookingStatus || booking.bookingStatus !== "approved") {
        booking.bookingStatus = "approved";
      }
      await booking.save();

      console.log(`📄 Invoice uploaded for booking ${bookingId}: ${invoiceUrl}`);

      // Notify candidate (use populated user if available, else fallback to booking.email)
      const candidateEmail = (booking.userId && booking.userId.email) ? booking.userId.email : booking.email;
      const candidateName = (booking.userId && booking.userId.fullName) ? booking.userId.fullName : booking.firstName;
      const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal-1.onrender.com";

      const htmlBody = `
        <p>Dear ${candidateName},</p>
        <p>Your booking <strong>${booking.bookingId}</strong> has been approved and your invoice is now available.</p>
        <p>You may download it directly here: <a href="${invoiceUrl}">${invoiceUrl}</a></p>
        <p>Or click below to visit your portal:</p>
        <p>
          <a href="${frontendUrl}/step2.html?bookingId=${booking.bookingId}" style="display:inline-block;padding:12px 24px;background:#28a745;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View My Portal</a>
        </p>
        <p>Thank you,<br>IHC Team</p>
      `;

      try {
        await sendBookingNotification(candidateEmail, "Your IHC Invoice is Ready", htmlBody);
        console.log(`📧 Invoice email sent to ${candidateEmail}`);
      } catch (emailErr) {
        console.error("❌ Error sending invoice email:", emailErr.message);
      }

      res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ Error saving invoice:", err.message);
      res.status(500).json({ success: false, message: "Server error saving invoice" });
    }
  });

  // ------------------------------------------------------------------
  // Fetch bookings for a given user
  // GET /api/booking/:userId
  // ------------------------------------------------------------------
  router.get("/:userId", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.id !== userId) return res.status(403).json({ success: false, message: "Unauthorized" });

      const bookings = await Booking.find({ userId }).select("-__v");
      res.json({ success: true, bookings });
    } catch (err) {
      console.error("❌ Fetch bookings error:", err.message);
      res.status(500).json({ success: false, message: "Server error fetching bookings" });
    }
  });

  // ------------------------------------------------------------------
  // Delete booking (if not approved)
  // DELETE /api/booking/:bookingId
  // ------------------------------------------------------------------
  router.delete("/:bookingId", authMiddleware, async (req, res) => {
    try {
      const booking = await Booking.findOne({ bookingId: req.params.bookingId });
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

      if (booking.bookingStatus === "approved") {
        return res.status(400).json({ success: false, message: "Approved bookings cannot be deleted" });
      }

      await booking.deleteOne();
      res.json({ success: true, message: "Booking deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting booking:", err.message);
      res.status(500).json({ success: false, message: "Server error deleting booking" });
    }
  });

  // ------------------------------------------------------------------
  // Staff: list all bookings (staff-only)
  // GET /api/staff/bookings
  // ------------------------------------------------------------------
  router.get("/staff/bookings", staffMiddleware, async (req, res) => {
    try {
      const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
      res.json({ success: true, bookings });
    } catch (err) {
      console.error("❌ Error fetching all bookings:", err.message);
      res.status(500).json({ success: false, message: "Server error fetching bookings" });
    }
  });

  return router;
};
