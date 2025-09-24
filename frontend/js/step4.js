// js/step4.js
document.addEventListener("DOMContentLoaded", async () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const paymentMethodEl = document.getElementById("paymentMethod");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");
  const ihcCodeContainer = document.getElementById("ihcCodeContainer");
  const ihcCodeEl = document.getElementById("ihcCode");

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!userId || !token) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
    return;
  }

  let bookingData = null;

  try {
    // ✅ Fetch latest bookings with authorization
    const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}`, {
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    console.log("Booking fetch response:", data);

    if (!data.success || !data.bookings || data.bookings.length === 0) {
      alert("No booking found. Please complete Step 3 first.");
      window.location.href = "step3.html";
      return;
    }

    // Take the most recent booking
    bookingData = data.bookings[data.bookings.length - 1];

  } catch (err) {
    console.error("Error fetching booking:", err);
    alert("Unable to load booking details. Please try again later.");
    return;
  }

  // Render booking summary
  bookingSummaryEl.innerHTML = `
    <p><strong>Name:</strong> ${bookingData.firstName || ''} ${bookingData.middleName || ''} ${bookingData.lastName || ''}</p>
    <p><strong>Passport:</strong> ${bookingData.passportNumber || 'N/A'}</p>
    <p><strong>Nationality:</strong> ${bookingData.nationality || 'N/A'}</p>
    <p><strong>Date of Birth:</strong> ${bookingData.dob || 'N/A'}</p>
    <p><strong>Address:</strong> ${bookingData.address || 'N/A'}</p>
    <p><strong>Company Sponsor:</strong> ${bookingData.sponsorCompany || 'N/A'}</p>
    <p><strong>Airline Sponsor:</strong> ${bookingData.sponsorAirline || 'N/A'}</p>
    <p><strong>Appointment:</strong> ${bookingData.bookingDate || 'N/A'} at ${bookingData.timeSlot || 'N/A'}</p>
    <p><strong>Status:</strong> ${bookingData.bookingStatus || 'N/A'}</p>
    <p><strong>Payment Status:</strong> ${bookingData.paymentStatus || 'pending'}</p>
  `;

  // Show invoice only if approved
  if (bookingData.bookingStatus === "approved" && bookingData.invoiceUrl) {
    invoiceContainer.style.display = "block";
    invoiceLink.href = bookingData.invoiceUrl;
  } else {
    invoiceContainer.style.display = "none";
  }

  // Show IHC code if payment confirmed
  if (bookingData.paymentStatus === "confirmed" && bookingData.ihcCode) {
    ihcCodeContainer.style.display = "block";
    ihcCodeEl.textContent = bookingData.ihcCode;

    // Hide payment form since already paid
    paymentForm.style.display = "none";
  } else {
    ihcCodeContainer.style.display = "none";
    paymentForm.style.display = "block";
  }

  // Payment form handling
  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const method = paymentMethodEl.value;
    if (!method) {
      alert("Please select a payment method.");
      return;
    }

    try {
      const res = await fetch(
        `https://ihc-portal.onrender.com/api/booking/${userId}/paymentMethod`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ paymentMethod: method, booking: bookingData }),
        }
      );

      const result = await res.json();
      console.log("Payment method submission response:", result);

      if (res.ok && result.success) {
        bookingData.paymentMethod = method;
        bookingData.bookingStatus = "pendingApproval";
        localStorage.setItem("booking", JSON.stringify(bookingData));

        alert(
          "Booking Completed. IHC staff will generate your invoice once your booking request has been approved. Please check your email."
        );
        window.location.href = "step2.html";
      } else {
        alert(`Failed to submit payment method: ${result.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Payment method error:", err);
      alert("Error submitting payment method. Try again later.");
    }
  });
});
