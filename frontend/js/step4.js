// js/step4.js

document.addEventListener("DOMContentLoaded", async () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");

  // ✅ Get booking info from localStorage
  const bookingData = JSON.parse(localStorage.getItem("booking"));
  const userId = localStorage.getItem("userId");

  if (!bookingData || !userId) {
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

  // ✅ Hide invoice unless booking approved
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

    try {
      // ✅ Send to backend
      const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}/paymentMethod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method, booking: bookingData }),
      });

      if (res.ok) {
        const result = await res.json();

        // Update local copy with pending status
        bookingData.paymentMethod = method;
        bookingData.bookingStatus = "pendingApproval";
        localStorage.setItem("booking", JSON.stringify(bookingData));

        alert("Booking Completed. IHC staff will generate your invoice once your booking request has been approved. Please check your email.");
        window.location.href = "step2.html"; // ✅ Redirect back to portal
      } else {
        const error = await res.json();
        alert(`Failed to submit payment method: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Payment method error:", err);
      alert("Error submitting payment method. Try again later.");
    }
  });
});

// NOTE: repo sync test 09/19/2025 23:19:43
