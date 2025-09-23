const API_BASE = "https://ihc-portal.onrender.com";

const token = localStorage.getItem("token");

if (!token) {
  alert("Please login first.");
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("fullName");
  window.location.href = "login.html";
}

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

  try {
    const statusRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!statusRes.ok) {
      alert("Session expired. Please login again.");
      logout();
      return;
    }

    const statusData = await statusRes.json();
    const user = statusData.user;

    welcomeEl.textContent = `Welcome ${user.fullName || "Registered User"}`;
    paymentStatusEl.textContent = `Payment Status: ${user.paymentStatus || "unknown"}`;
    ihcCodeEl.textContent = user.ihcCode ? `IHC Code: ${user.ihcCode}` : "";

    localStorage.setItem("fullName", user.fullName);
    localStorage.setItem("userId", user._id);

    startBtn.disabled = false;
    startBtn.addEventListener("click", () => {
      window.location.href = "step3.html";
    });

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.className = "btn btn-small";
    logoutBtn.style.marginLeft = "10px";
    logoutBtn.onclick = logout;
    welcomeEl.insertAdjacentElement("afterend", logoutBtn);

    // ✅ Fetch bookings
    const bookingRes = await fetch(`${API_BASE}/api/booking/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const bookingData = await bookingRes.json();
    const userBookings = bookingData.bookings || [];

    bookingList.innerHTML = "";
    if (userBookings.length === 0) {
      bookingList.innerHTML = "<li>No bookings found.</li>";
      bookingStatusEl.textContent = "No bookings yet.";
      if (invoiceBtn) invoiceBtn.style.display = "none";
    } else {
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
        }
        bookingList.appendChild(li);
      });

      const latest = userBookings[userBookings.length - 1];
      if (latest) {
        bookingStatusEl.textContent = latest.bookingStatus === "approved" ? "Booking Approved" : "Booking Approval Pending – No invoice yet";
        if (invoiceBtn) {
          invoiceBtn.style.display = latest.bookingStatus === "approved" ? "inline-block" : "none";
          invoiceBtn.onclick = () => window.viewInvoice(latest);
        }
      }
    }
  } catch (err) {
    console.error("Portal error:", err);
    welcomeEl.textContent = "Unable to fetch status. Please try again later.";
    if (invoiceBtn) invoiceBtn.style.display = "none";
  }
});
