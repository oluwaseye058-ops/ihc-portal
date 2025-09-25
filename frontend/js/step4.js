document.addEventListener("DOMContentLoaded", () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const paymentMethodEl = document.getElementById("paymentMethod");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");
  const ihcCodeContainer = document.getElementById("ihcCodeContainer");
  const ihcCodeEl = document.getElementById("ihcCode");
  const API_BASE = "https://ihc-portal.onrender.com";

  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";
  const showMessage = (msg, isError = true) => {
    const div = document.createElement("div");
    div.className = `message ${isError ? "error" : "success"}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  };

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
  const selectedBookingId = sessionStorage.getItem("selectedBookingId");

  if (!token || !userId || !selectedBookingId) {
    showMessage("Session expired or no booking selected. Please login or complete Step 3.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  let bookingData = null;

  const fetchBooking = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.bookings || data.bookings.length === 0) {
        showMessage("No booking found. Please complete Step 3 first.");
        setTimeout(() => (window.location.href = "step3.html"), 1000);
        return null;
      }

      bookingData = data.bookings.find((b) => b.bookingId === selectedBookingId);
      if (!bookingData) {
        showMessage("Selected booking not found.");
        setTimeout(() => (window.location.href = "step2.html"), 1000);
        return null;
      }

      return bookingData;
    } catch (err) {
      console.error("Error fetching booking:", err);
      showMessage("Unable to load booking details. Please try again later.");
      return null;
    }
  };

  const renderBookingSummary = () => {
    if (!bookingData) return;
    bookingSummaryEl.innerHTML = `
      <p><strong>Name:</strong> ${sanitize(bookingData.firstName || "")} ${sanitize(bookingData.middleName || "")} ${sanitize(bookingData.lastName || "")}</p>
      <p><strong>Passport:</strong> ${sanitize(bookingData.passportNumber || "N/A")}</p>
      <p><strong>Nationality:</strong> ${sanitize(bookingData.nationality || "N/A")}</p>
      <p><strong>Date of Birth:</strong> ${sanitize(bookingData.dob || "N/A")}</p>
      <p><strong>Address:</strong> ${sanitize(bookingData.address || "N/A")}</p>
      <p><strong>Company Sponsor:</strong> ${sanitize(bookingData.sponsorCompany || "N/A")}</p>
      <p><strong>Airline Sponsor:</strong> ${sanitize(bookingData.sponsorAirline || "N/A")}</p>
      <p><strong>Appointment:</strong> ${sanitize(bookingData.bookingDate || "N/A")} at ${sanitize(bookingData.timeSlot || "N/A")}</p>
      <p><strong>Status:</strong> ${sanitize(bookingData.bookingStatus || "N/A")}</p>
      <p><strong>Payment Status:</strong> ${sanitize(bookingData.paymentStatus || "pending")}</p>
    `;
  };

  const updateUI = () => {
    if (!bookingData) return;

    if (bookingData.bookingStatus === "approved" && bookingData.invoiceUrl) {
      invoiceContainer.style.display = "block";
      invoiceLink.href = sanitize(bookingData.invoiceUrl);
    } else {
      invoiceContainer.style.display = "none";
    }

    if (bookingData.paymentStatus === "confirmed" && bookingData.ihcCode) {
      ihcCodeContainer.style.display = "block";
      ihcCodeEl.textContent = sanitize(bookingData.ihcCode);
      paymentForm.style.display = "none";
    } else {
      ihcCodeContainer.style.display = "none";
      paymentForm.style.display = "block";
    }
  };

  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const method = paymentMethodEl.value;
    const validMethods = ["bankTransfer", "paypal", "westernUnion", "moneyGram"];

    if (!validMethods.includes(method)) {
      showMessage("Please select a valid payment method.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}/paymentMethod`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethod: method, booking: { bookingId: bookingData.bookingId } }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        bookingData.paymentMethod = method;
        bookingData.bookingStatus = "pendingApproval";
        sessionStorage.setItem("booking", JSON.stringify(bookingData));
        showMessage(
          "Payment method submitted. IHC staff will approve your booking and generate your invoice. Check your email.",
          false
        );
        setTimeout(() => (window.location.href = "step2.html"), 1500);
      } else {
        showMessage(result.message || "Failed to submit payment method.");
      }
    } catch (err) {
      console.error("Error submitting payment method:", err);
      showMessage("Error submitting payment method. Try again later.");
    }
  });

  const init = async () => {
    const booking = await fetchBooking();
    if (booking) {
      renderBookingSummary();
      updateUI();
    }
  };

  init();
});
