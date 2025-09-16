document.addEventListener("DOMContentLoaded", async () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");

  // ✅ Get booking info from localStorage
  const bookingData = JSON.parse(localStorage.getItem("booking"));

  if (!bookingData) {
    alert("No booking found. Please complete Step 3 first.");
    window.location.href = "step3.html";
    return;
  }

  // ✅ Render booking summary
  bookingSummaryEl.innerHTML = `
    <p><strong>Name:</strong> ${bookingData.firstName} ${bookingData.middleName || ''} ${bookingData.lastName}</p>
    <p><strong>Passport:</strong> ${bookingData.passport}</p>
    <p><strong>Nationality:</strong> ${bookingData.nationality}</p>
    <p><strong>Date of Birth:</strong> ${bookingData.dob}</p>
    <p><strong>Address:</strong> ${bookingData.address}</p>
    <p><strong>Company Sponsor:</strong> ${bookingData.sponsorCompany}</p>
    <p><strong>Airline Sponsor:</strong> ${bookingData.sponsorAirline}</p>
    <p><strong>Appointment:</strong> ${bookingData.bookingDate} at ${bookingData.timeSlot}</p>
  `;

  // ✅ Hide invoice unless backend later attaches it
  if (bookingData.bookingStatus === "approved") {
    invoiceContainer.style.display = "block";
    invoiceLink.href = bookingData.invoiceUrl || "#";
  }

  // ✅ Payment form handling
  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const method = document.getElementById("paymentMethod").value;

    if (!method) {
      alert("Please select a payment method.");
      return;
    }

    // For now, just store locally — later we’ll sync to backend
    bookingData.paymentMethod = method;
    localStorage.setItem("booking", JSON.stringify(bookingData));

    alert("Payment preference saved. Invoice will appear once staff approves your booking.");
  });
});
