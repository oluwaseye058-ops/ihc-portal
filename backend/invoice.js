// backend/invoice.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const User = require("../models/user");

module.exports = function (sendBookingNotification) {
  /**
   * Approve a booking & attach invoice
   * PUT /api/invoice/:bookingId/approve
   */
  router.put("/:bookingId/approve", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { invoiceUrl } = req.body;

      const booking = await Booking.findOne({ bookingId }).populate("userId");
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      booking.bookingStatus = "approved";
      booking.invoiceUrl = invoiceUrl;
      await booking.save();

      // ✅ Send email to candidate
      if (booking.userId && booking.userId.email) {
        try {
          await sendBookingNotification(
            booking.userId.email,
            "Booking Approved – IHC",
            `<p>Dear ${booking.firstName} ${booking.lastName},</p>
             <p>Your booking has been <strong>approved</strong>.</p>
             <p>You may now download your invoice from your portal.</p>
             <p><a href="https://ihc-portal.onrender.com/invoice.html" 
                   style="padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;">
                Go to Your Portal
             </a></p>`
          );
          console.log(`📧 Approval email sent to ${booking.userId.email}`);
        } catch (emailErr) {
          console.error("❌ Error sending approval email:", emailErr.message);
        }
      }

      res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ Approve booking error:", err);
      res.status(500).json({ error: "Server error updating booking" });
    }
  });

  return router;
};
