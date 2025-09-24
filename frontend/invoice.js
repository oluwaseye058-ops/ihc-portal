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
  
    // ✅ Get bookingId from URL (e.g., ?bookingId=BK1234)
    const urlParams = new URLSearchParams(window.location.search);
    const bookingIdFromUrl = urlParams.get("bookingId");
  
    let booking = null;
  
    try {
      const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}`);
      const data = await res.json();
  
      if (res.ok && data.success && data.bookings && data.bookings.length > 0) {
        if (bookingIdFromUrl) {
          booking = data.bookings.find(b => b.bookingId === bookingIdFromUrl);
        }
        if (!booking) {
          // fallback to latest booking
          booking = data.bookings[data.bookings.length - 1];
        }
      }
    } catch (err) {
      console.error("Error fetching booking from backend:", err);
    }
  
    if (!booking) {
      bookingDetailsEl.innerHTML = "<p>No bookings found.</p>";
      return;
    }
  
    // ✅ Render booking details
    bookingDetailsEl.innerHTML = `
      <p><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</p>
      <p><strong>Passport:</strong> ${booking.passportNumber}</p>
      <p><strong>Nationality:</strong> ${booking.nationality}</p>
      <p><strong>Date of Birth:</strong> ${booking.dob}</p>
      <p><strong>Address:</strong> ${booking.address}</p>
      <p><strong>Company Sponsor:</strong> ${booking.sponsorCompany}</p>
      <p><strong>Airline Sponsor:</strong> ${booking.sponsorAirline}</p>
      <p><strong>Appointment:</strong> ${booking.bookingDate} at ${booking.timeSlot}</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod || "Not provided"}</p>
      <p><strong>Status:</strong> ${booking.bookingStatus || "pending approval"}</p>
    `;
  
    // ✅ Show invoice or pending message
    if (booking.bookingStatus === "approved" && booking.invoiceUrl) {
      invoiceSection.style.display = "block";
      invoiceDownload.href = booking.invoiceUrl;
    } else {
      pendingSection.style.display = "block";
    }
  });
  