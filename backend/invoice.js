// backend/invoice.js
const express = require("express");
const router = express.Router();
const Booking = require("./models/booking");
const User = require("./models/user");

module.exports = function (sendBookingNotification) {
  /**
   * Approve a booking & attach invoice
   * PUT /api/invoice/:bookingId/approve
   */
  router.put("/:bookingId/approve", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { invoiceUrl } = req.body; // staff provides this URL

      const booking = await Booking.findOne({ bookingId }).populate("userId");
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      // ✅ Update booking
      booking.bookingStatus = "approved";
      booking.invoiceUrl = invoiceUrl;
      await booking.save();

      // ✅ Send email to candidate with direct link to invoice
      if (booking.userId && booking.userId.email) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || "https://ihc-portal.onrender.com";
          await sendBookingNotification(
            booking.userId.email,
            "IHC Booking Approved – Invoice Available",
            `
              <p>Dear ${booking.firstName} ${booking.lastName},</p>
              <p>Your booking has been <strong>approved</strong> by IHC staff.</p>
              <p>You may now download your invoice:</p>
              <p>
                <a href="${frontendUrl}/invoice.html?bookingId=${booking.bookingId}" 
                   style="padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">
                   View Invoice
                </a>
              </p>
              <p>Thank you,<br>IHC Team</p>
            `
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
