document.addEventListener("DOMContentLoaded", async () => {
  const summaryEl = document.getElementById("confirmationSummary");
  const ihcCodeContainer = document.getElementById("ihcCodeContainer");
  const ihcCodeEl = document.getElementById("ihcCode");
  const downloadPdfLink = document.getElementById("downloadPdf");

  const userId = "abc123"; // replace with real logged-in user/session

  // Fetch booking + payment info from backend
  const res = await fetch(`/api/booking/${userId}`);
  if (!res.ok) {
    alert("Unable to fetch booking info. Please try again later.");
    return;
  }

  const bookingData = await res.json();

  summaryEl.innerHTML = `
    <p><strong>Name:</strong> ${bookingData.firstName} ${bookingData.middleName || ''} ${bookingData.lastName}</p>
    <p><strong>Passport:</strong> ${bookingData.passport}</p>
    <p><strong>Payment Method:</strong> ${bookingData.paymentMethod || ''}</p>
    <p><strong>Payment Status:</strong> ${bookingData.paymentStatus}</p>
    <p><strong>Appointment:</strong> ${bookingData.bookingDate} at ${bookingData.timeSlot}</p>
  `;

  // Show IHC code if payment confirmed
  if (bookingData.paymentStatus === "confirmed" && bookingData.ihcCode) {
    ihcCodeContainer.style.display = "block";
    ihcCodeEl.textContent = bookingData.ihcCode;

    downloadPdfLink.addEventListener("click", (e) => {
      e.preventDefault();
      // Backend can generate PDF dynamically
      window.open(`/api/booking/${userId}/downloadPdf`, "_blank");
    });
  }
});
