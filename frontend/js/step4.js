document.addEventListener("DOMContentLoaded", () => {
  const bookingSummaryEl = document.getElementById("bookingSummary");
  const paymentForm = document.getElementById("paymentForm");
  const paymentMethodEl = document.getElementById("paymentMethod");
  const invoiceContainer = document.getElementById("invoiceContainer");
  const invoiceLink = document.getElementById("invoiceLink");
  const ihcCodeContainer = document.getElementById("ihcCodeContainer");
  const ihcCodeEl = document.getElementById("ihcCode");
  const messagesContainer = document.getElementById("messages");
  const API_BASE = "https://ihc-portal.onrender.com";

  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";

  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("token");
  const selectedBookingId = sessionStorage.getItem("selectedBookingId");

  if (!userId || !token || !selectedBookingId) {
    showMessage("Session expired or no booking selected. Please login or complete Step 3.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  let bookingData = null;

  function showMessage(message, isError = true) {
    if (!messagesContainer) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => msgDiv.remove());
    msgDiv.appendChild(closeBtn);

    messagesContainer.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 5000);
  }

  const fetchBooking = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.bookings)) throw new Error("Invalid booking data.");
      bookingData = data.bookings.find((b) => b.bookingId === selectedBookingId);
      if (!bookingData) {
        showMessage("Selected booking not found.");
        setTimeout(() => (window.location.href = "step2.html"), 1000);
        return null;
      }
      return bookingData;
    } catch (err) {
      console.error(err);
      showMessage("Unable to load booking details. Please try again later.");
      return null;
    }
  };

  const renderBookingSummary = () => {
    if (!bookingData) return;
    const name = [bookingData.firstName, bookingData.middleName, bookingData.lastName].filter(Boolean).join(" ");
    bookingSummaryEl.innerHTML = `
      <p><strong>Name:</strong> ${sanitize(name)}</p>
      <p><strong>Passport:</strong> ${sanitize(bookingData.passportNumber || 'N/A')}</p>
      <p><strong>Nationality:</strong> ${sanitize(bookingData.nationality || 'N/A')}</p>
      <p><strong>Date of Birth:</strong> ${sanitize(bookingData.dob || 'N/A')}</p>
      <p><strong>Address:</strong> ${sanitize(bookingData.address || 'N/A')}</p>
      <p><strong>Company Sponsor:</strong> ${sanitize(bookingData.sponsorCompany || 'N/A')}</p>
      <p><strong>Airline Sponsor:</strong> ${sanitize(bookingData.sponsorAirline || 'N/A')}</p>
      <p><strong>Appointment:</strong> ${sanitize(bookingData.bookingDate || 'N/A')} at ${sanitize(bookingData.timeSlot || 'N/A')}</p>
      <p><strong>Status:</strong> ${sanitize(bookingData.bookingStatus || 'N/A')}</p>
      <p><strong>Payment Status:</strong> ${sanitize(bookingData.paymentStatus || 'pending')}</p>
      <p><strong>Selected Payment Method:</strong> ${sanitize(bookingData.paymentMethod || 'Not Selected')}</p>
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
    }

    // Disable select & button if payment method already submitted
    if (bookingData.paymentMethod) {
      paymentMethodEl.value = bookingData.paymentMethod;
      paymentMethodEl.disabled = true;
      paymentForm.querySelector("button[type='submit']").disabled = true;
    } else {
      paymentMethodEl.disabled = false;
      paymentForm.querySelector("button[type='submit']").disabled = false;
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

    const submitBtn = paymentForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    submitBtn.appendChild(spinner);

    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}/paymentMethod`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: method, booking: { bookingId: bookingData.bookingId } }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        bookingData.paymentMethod = method;
        bookingData.bookingStatus = "pendingApproval";
        bookingData.paymentStatus = "pending";
        sessionStorage.setItem("booking", JSON.stringify(bookingData));

        showMessage("Payment preference submitted. Redirecting to portal...", false);

        setTimeout(() => {
          window.location.href = "step2.html";
        }, 1500);
      } else {
        showMessage(`Failed to submit payment method: ${result.message || "Unknown error"}`);
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      showMessage("Error submitting payment method. Try again later.");
      submitBtn.disabled = false;
    } finally {
      spinner.remove();
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
