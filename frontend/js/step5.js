// public/js/step5.js
document.addEventListener("DOMContentLoaded", async () => {
  const summaryEl = document.getElementById("confirmationSummary");
  const ihcCodeContainer = document.getElementById("ihcCodeContainer");
  const ihcCodeEl = document.getElementById("ihcCode");
  const downloadPdfLink = document.getElementById("downloadPdf");

  // ✅ Get bookingId from query string
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("bookingId");

  if (!bookingId) {
    summaryEl.innerHTML = `<p style="color:red;">No booking specified. Please check your link.</p>`;
    return;
  }

  try {
    // Fetch booking info by bookingId
    const res = await fetch(`/api/booking/id/${bookingId}`);
    if (!res.ok) {
      summaryEl.innerHTML = `<p style="color:red;">Unable to fetch booking info. Please try again later.</p>`;
      return;
    }

    const { booking } = await res.json();

    summaryEl.innerHTML = `
      <p><strong>Name:</strong> ${booking.firstName} ${booking.middleName || ""} ${booking.lastName}</p>
      <p><strong>Passport:</strong> ${booking.passport || "N/A"}</p>
      <p><strong>Payment Method:</strong> ${booking.paymentMethod || "N/A"}</p>
      <p><strong>Payment Status:</strong> ${booking.paymentStatus || "pending"}</p>
      <p><strong>Appointment:</strong> ${booking.bookingDate} at ${booking.timeSlot}</p>
    `;

    // Show IHC code if payment confirmed
    if (booking.paymentStatus === "confirmed" && booking.ihcCode) {
      ihcCodeContainer.style.display = "block";
      ihcCodeEl.textContent = booking.ihcCode;

      downloadPdfLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(`/api/booking/${bookingId}/downloadPdf`, "_blank");
      });
    }
  } catch (err) {
    console.error("❌ Error fetching booking:", err);
    summaryEl.innerHTML = `<p style="color:red;">Error loading booking details.</p>`;
  }
});
