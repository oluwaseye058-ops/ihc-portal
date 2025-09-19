// js/step2.js
const API_BASE = "https://ihc-portal.onrender.com";  // 👈 use your Render backend


// Get userId from either sessionStorage or localStorage
const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

if (!userId) {
  alert("No user found. Please register first.");
  window.location.href = "step1.html";
}

// Helper used by invoice buttons to preserve selected booking and go to invoice page
window.viewInvoice = function (booking) {
  if (!booking) return;
  localStorage.setItem("selectedBookingId", booking.bookingId);
  localStorage.setItem("selectedBooking", JSON.stringify(booking));
  window.location.href = "invoice.html";
};

document.addEventListener("DOMContentLoaded", async () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingStatusEl = document.getElementById("bookingStatus");
  const invoiceBtn = document.getElementById("invoiceBtn");
  const bookingList = document.getElementById("bookingList");

  if (!welcomeEl || !paymentStatusEl || !ihcCodeEl || !startBtn || !bookingList) {
    console.error("Missing expected DOM elements in step2.html");
    return;
  }

  try {
    // Fetch user status
    const statusRes = await fetch(`${API_BASE}/api/status/${userId}`);
    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({}));
      welcomeEl.textContent = `Error: ${err.error || "Unable to fetch status."}`;
      return;
    }
    const statusData = await statusRes.json();

    welcomeEl.textContent = `Welcome ${statusData.fullName || "Registered User"}`;
    paymentStatusEl.textContent = `Payment Status: ${statusData.paymentStatus || "unknown"}`;
    ihcCodeEl.textContent = statusData.ihcCode ? `IHC Code: ${statusData.ihcCode}` : "";

    // After fetching statusData in step2.js
    if (statusData.fullName) {
    localStorage.setItem("fullName", statusData.fullName);
}


    startBtn.disabled = false;
    startBtn.addEventListener("click", () => {
      window.location.href = "step3.html";
    });

    // Fetch bookings
    const bookingRes = await fetch(`${API_BASE}/api/booking/${userId}`);
    if (!bookingRes.ok) {
      bookingList.innerHTML = "<li>No bookings found.</li>";
      bookingStatusEl.textContent = "Booking information unavailable.";
      if (invoiceBtn) invoiceBtn.style.display = "none";
      return;
    }

    const bookingData = await bookingRes.json();
    const userBookings = (bookingData && bookingData.bookings) ? bookingData.bookings : [];

    if (userBookings.length === 0) {
      bookingList.innerHTML = "<li>No bookings found.</li>";
      bookingStatusEl.textContent = "No bookings yet.";
      if (invoiceBtn) invoiceBtn.style.display = "none";
      return;
    }

    bookingList.innerHTML = "";
    userBookings.forEach((b) => {
      const li = document.createElement("li");
      li.className = "booking-item";
      li.innerHTML = `
        <div>
          <p><strong>Booking ID:</strong> ${b.bookingId || "N/A"}</p>
          <p><strong>Appointment:</strong> ${b.bookingDate} at ${b.timeSlot}</p>
          <p><strong>Passport:</strong> ${b.passport || "N/A"}</p>
          <p><strong>Status:</strong> ${b.bookingStatus || "pendingApproval"}</p>
          <p><strong>Payment Method:</strong> ${b.paymentMethod || "Not selected"}</p>
        </div>
      `;

      if (b.bookingStatus === "approved" && b.invoiceUrl) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-small";
        btn.textContent = "View Invoice";
        btn.addEventListener("click", () => window.viewInvoice(b));
        li.appendChild(btn);
      } else {
        const span = document.createElement("span");
        span.style.marginLeft = "8px";
        span.textContent = b.bookingStatus ? ` (${b.bookingStatus})` : " (Approval pending)";
        li.querySelector("div").appendChild(span);
      }

      bookingList.appendChild(li);
    });

    // Handle latest booking summary
    const latest = userBookings[userBookings.length - 1];
    if (latest) {
      if (latest.bookingStatus === "approved") {
        bookingStatusEl.textContent = "Booking Approved";
        if (invoiceBtn) {
          invoiceBtn.style.display = "inline-block";
          invoiceBtn.onclick = () => window.viewInvoice(latest);
        }
      } else {
        bookingStatusEl.textContent = "Booking Approval Pending – No invoice yet";
        if (invoiceBtn) invoiceBtn.style.display = "none";
      }
    }

  } catch (err) {
    console.error("Portal error:", err);
    welcomeEl.textContent = "Unable to fetch status. Please try again later.";
    if (invoiceBtn) invoiceBtn.style.display = "none";
  }
});

// NOTE: repo sync test 09/19/2025 23:19:43
