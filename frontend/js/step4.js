// js/step4.js

document.addEventListener("DOMContentLoaded", async () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");

  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
    return;
  }

  let bookingData = null;

  try {
    // ✅ Fetch latest bookings from backend
    const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}`);
    if (!res.ok) {
      throw new Error("Failed to fetch booking details");
    }
    const data = await res.json();

    if (!data.success || !data.bookings || data.bookings.length === 0) {
      alert("No booking found. Please complete Step 3 first.");
      window.location.href = "step3.html";
      return;
    }

    // ✅ Always take the most recent booking
    bookingData = data.bookings[data.bookings.length - 1];
  } catch (err) {
    console.error("Error fetching booking:", err);
    alert("Unable to load booking details. Please try again later.");
    return;
  }

  // ✅ Render booking summary
  bookingSummaryEl.innerHTML = `
    <p><strong>Name:</strong> ${bookingData.firstName} ${bookingData.middleName || ''} ${bookingData.lastName}</p>
    <p><strong>Passport:</strong> ${bookingData.passportNumber || bookingData.passportNumber || ''}</p>
    <p><strong>Nationality:</strong> ${bookingData.nationality || ''}</p>
    <p><strong>Date of Birth:</strong> ${bookingData.dob || ''}</p>
    <p><strong>Address:</strong> ${bookingData.address || ''}</p>
    <p><strong>Company Sponsor:</strong> ${bookingData.sponsorCompany || ''}</p>
    <p><strong>Airline Sponsor:</strong> ${bookingData.sponsorAirline || ''}</p>
    <p><strong>Appointment:</strong> ${bookingData.bookingDate || ''} at ${bookingData.timeSlot || ''}</p>
    <p><strong>Status:</strong> ${bookingData.bookingStatus || 'N/A'}</p>
  `;

  // ✅ Show invoice only if booking approved
  if (bookingData.bookingStatus === "approved") {
    invoiceContainer.style.display = "block";
    invoiceLink.href = bookingData.invoiceUrl || "#";
  } else {
    invoiceContainer.style.display = "none";
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
      const res = await fetch(
        `https://ihc-portal.onrender.com/api/booking/${userId}/paymentMethod`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod: method, booking: bookingData }),
        }
      );

      if (res.ok) {
        const result = await res.json();

        // Update localStorage with new data
        bookingData.paymentMethod = method;
        bookingData.bookingStatus = "pendingApproval";
        localStorage.setItem("booking", JSON.stringify(bookingData));

        alert(
          "Booking Completed. IHC staff will generate your invoice once your booking request has been approved. Please check your email."
        );
        window.location.href = "step2.html"; // ✅ Redirect back to portal
      } else {
        const error = await res.json();
        alert(
          `Failed to submit payment method: ${error.message || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Payment method error:", err);
      alert("Error submitting payment method. Try again later.");
    }
  });
});
