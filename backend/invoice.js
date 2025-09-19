// js/invoice.js
document.addEventListener("DOMContentLoaded", async () => {
    const bookingDetailsEl = document.getElementById("bookingDetails");
    const invoiceSection = document.getElementById("invoiceSection");
    const pendingSection = document.getElementById("pendingSection");
    const invoiceDownload = document.getElementById("invoiceDownload");
  
    // ✅ Get userId from localStorage
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Session expired. Please log in again.");
      window.location.href = "step1.html";
      return;
    }
  
    let booking = null;
  
    // ✅ 1. Prefer booking stored in localStorage
    const storedBooking = localStorage.getItem("selectedBooking") || localStorage.getItem("booking");
    if (storedBooking) {
      try {
        booking = JSON.parse(storedBooking);
      } catch (e) {
        console.warn("Failed to parse stored booking:", e);
      }
    }
  
    // ✅ 2. If no booking found locally, fetch from backend
    if (!booking) {
      try {
        const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}`);
        const data = await res.json();
  
        if (res.ok && data.success && data.bookings && data.bookings.length > 0) {
          // If selectedBookingId exists, try to match it
          const selectedBookingId = localStorage.getItem("selectedBookingId");
          if (selectedBookingId) {
            booking = data.bookings.find(b => b.bookingId === selectedBookingId) || data.bookings[data.bookings.length - 1];
          } else {
            booking = data.bookings[data.bookings.length - 1]; // fallback to latest
          }
        }
      } catch (err) {
        console.error("Error fetching booking from backend:", err);
      }
    }
  
    // ✅ 3. If still no booking, show message
    if (!booking) {
      bookingDetailsEl.innerHTML = "<p>No bookings found.</p>";
      return;
    }
  
    // ✅ Render booking details
    bookingDetailsEl.innerHTML = `
      <p><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ''} ${booking.lastName}</p>
      <p><strong>Passport:</strong> ${booking.passport}</p>
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
  });
  
