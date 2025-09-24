document.addEventListener("DOMContentLoaded", async () => {
  const bookingDetailsEl = document.getElementById("bookingDetails");
  const invoiceSection = document.getElementById("invoiceSection");
  const pendingSection = document.getElementById("pendingSection");
  const invoiceDownload = document.getElementById("invoiceDownload");

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("bookingId");
  if (!bookingId) {
    bookingDetailsEl.innerHTML = "<p>No booking specified.</p>";
    return;
  }

  try {
    const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${bookingId}`);
    const data = await res.json();
    if (!data.success || !data.booking) {
      bookingDetailsEl.innerHTML = "<p>Booking not found.</p>";
      return;
    }

    const booking = data.booking;
    bookingDetailsEl.innerHTML = `
      <p><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ''} ${booking.lastName}</p>
      <p><strong>Appointment:</strong> ${booking.bookingDate} at ${booking.timeSlot}</p>
      <p><strong>Status:</strong> ${booking.bookingStatus}</p>
    `;

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
