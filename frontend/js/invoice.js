// frontend/js/invoice.js
document.addEventListener("DOMContentLoaded", async () => {
  const bookingDetailsEl = document.getElementById("bookingDetails");
  const invoiceSection = document.getElementById("invoiceSection");
  const pendingSection = document.getElementById("pendingSection");
  const invoiceDownload = document.getElementById("invoiceDownload");

  // ✅ Get bookingId from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("bookingId") || localStorage.getItem("latestBookingId");

  if (!bookingId) {
    bookingDetailsEl.innerHTML = "<p>No booking specified.</p>";
    return;
  }

  try {
    // ✅ Fetch booking by ID
    const res = await fetch(`https://ihc-portal.onrender.com/api/booking/id/${bookingId}`);
    const data = await res.json();

    if (!data.success || !data.booking) {
      bookingDetailsEl.innerHTML = "<p>Booking not found.</p>";
      return;
    }

    const booking = data.booking;

    // ✅ Store latestBookingId in localStorage
    localStorage.setItem("latestBookingId", booking.bookingId);

    // ✅ Render booking details
    bookingDetailsEl.innerHTML = `
      <p><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ''} ${booking.lastName}</p>
      <p><strong>Passport:</strong> ${booking.passportNumber}</p>
      <p><strong>Nationality:</strong> ${booking.nationality}</p>
      <p><strong>Date of Birth:</strong> ${booking.dob}</p>
      <p><strong>Address:</strong> ${booking.address}</p>
      <p><strong>Company Sponsor:</strong> ${booking.sponsorCompany}</p>
      <p><strong>Airline Sponsor:</strong> ${booking.sponsorAirline}</p>
      <p><strong>Appointment:</strong> ${booking.bookingDate} at ${booking.timeSlot}</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'Not provided'}</p>
      <p><strong>Status:</strong> ${booking.bookingStatus || 'pending approval'}</p>
    `;

    // ✅ Show invoice or pending message
    if (booking.bookingStatus === "approved" && booking.invoiceUrl) {
      invoiceSection.style.display = "block";
      invoiceDownload.href = booking.invoiceUrl;
    } else {
      pendingSection.style.display = "block";
    }

  } catch (err) {
    console.error(err);
    bookingDetailsEl.innerHTML = "<p>Error fetching booking details.</p>";
  }
});
