const express = require("express");

module.exports = function (transporter) {
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

    // Add booking ID + user link
    booking.bookingId = "BK" + Math.floor(1000 + Math.random() * 9000);
    booking.userId = userId;
    booking.bookingStatus = "pendingApproval"; // default status

    // Save booking
    bookings.push(booking);

    console.log("📅 New booking received for user:", userId, booking);

    // ✅ Send email to staff
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"IHC Portal" <${process.env.SMTP_USER}>`,
          to: process.env.STAFF_EMAIL, // staff recipient
          subject: `New IHC Booking: ${booking.bookingId}`,
          text: `
A new IHC booking has been submitted:

Name: ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}
Passport: ${booking.passport}
Nationality: ${booking.nationality}
Date of Birth: ${booking.dob}
Address: ${booking.address}
Company Sponsor: ${booking.sponsorCompany}
Airline Sponsor: ${booking.sponsorAirline}
Appointment: ${booking.bookingDate} at ${booking.timeSlot}

Booking ID: ${booking.bookingId}
User ID: ${userId}

Please review and approve the booking in the portal.
          `,
        });
        console.log("📧 Staff notified via email (initial booking)");
      } catch (err) {
        console.error("❌ Error sending staff email:", err);
      }
    }

    res.json({ success: true, booking });
  });

  // ✅ POST /api/booking/:userId/paymentMethod → save payment method + send emails
  router.post("/:userId/paymentMethod", async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod, booking } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing payment method" });
    }

    // Find booking
    const userBooking = bookings.find((b) => b.userId === userId && b.bookingId === booking.bookingId);
    if (!userBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Save method
    userBooking.paymentMethod = paymentMethod;
    userBooking.bookingStatus = "pendingApproval";

    console.log("💳 Payment method updated:", userBooking);

    if (transporter) {
      try {
        // ✅ Notify staff with booking + payment
        await transporter.sendMail({
          from: `"IHC Portal" <${process.env.SMTP_USER}>`,
          to: process.env.STAFF_EMAIL,
          subject: `Payment Method Submitted: ${userBooking.bookingId}`,
          text: `
A candidate has submitted a booking with payment details:

Name: ${userBooking.firstName} ${userBooking.middleName || ""} ${userBooking.lastName}
Passport: ${userBooking.passport}
Nationality: ${userBooking.nationality}
Date of Birth: ${userBooking.dob}
Address: ${userBooking.address}
Company Sponsor: ${userBooking.sponsorCompany}
Airline Sponsor: ${userBooking.sponsorAirline}
Appointment: ${userBooking.bookingDate} at ${userBooking.timeSlot}

Booking ID: ${userBooking.bookingId}
Payment Method: ${userBooking.paymentMethod}

Please review and approve this booking in the portal to generate invoice.
          `,
        });

        // ✅ Notify candidate
        await transporter.sendMail({
          from: `"IHC Portal" <${process.env.SMTP_USER}>`,
          to: userBooking.email, // candidate email
          subject: "IHC Booking Request Received",
          html: `
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
          `,
        });

        console.log("📧 Staff + candidate notified (payment stage)");
      } catch (err) {
        console.error("❌ Error sending payment emails:", err);
      }
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

// NOTE: repo sync test 09/19/2025 23:19:43
