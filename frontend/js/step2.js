document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingStatusEl = document.getElementById("bookingStatus");
  const invoiceBtn = document.getElementById("invoiceBtn");
  const bookingList = document.getElementById("bookingList");
  const logoutBtn = document.getElementById("logoutBtn");
  const API_BASE = "https://ihc-portal.onrender.com";

  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  };

  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";

  // ✅ Only use sessionStorage for token
  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");

  if (!token || !userId) {
    showMessage("Session expired. Please login.");
    return setTimeout(() => (window.location.href = "login.html"), 1000);
  }

  const logout = () => {
    sessionStorage.clear();
    showMessage("Logged out successfully!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  if (!logoutBtn) {
    const btn = document.createElement("button");
    btn.textContent = "Logout";
    btn.className = "logout-btn";
    btn.onclick = logout;
    welcomeEl.insertAdjacentElement("afterend", btn);
  } else {
    logoutBtn.onclick = logout;
  }

  startBtn.addEventListener("click", () => {
    window.location.href = "step3.html";
  });

  const handle401 = () => {
    sessionStorage.clear();
    showMessage("Session expired. Please login again.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handle401();
      if (!res.ok) return showMessage("Error fetching user info.");

      const { user } = await res.json();
      welcomeEl.textContent = `Welcome ${sanitize(user.fullName)}`;
      paymentStatusEl.textContent = `Payment Status: ${sanitize(user.paymentStatus) || "pending"}`;
      ihcCodeEl.textContent = user.ihcCode ? `IHC Code: ${sanitize(user.ihcCode)}` : "";
    } catch (err) {
      console.error(err);
      showMessage("Error connecting to server.");
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handle401();
      if (!res.ok) return showMessage("Error loading bookings.");

      const data = await res.json();
      const userBookings = data.bookings || [];
      bookingList.innerHTML = "";

      if (userBookings.length === 0) {
        bookingList.innerHTML = "<li>No bookings found.</li>";
        bookingStatusEl.textContent = "No bookings yet.";
        invoiceBtn.style.display = "none";
        return;
      }

      userBookings.forEach((b) => {
        const li = document.createElement("li");
        li.className = "booking-item";
        li.innerHTML = `
          <div>
            <p><strong>Booking ID:</strong> ${sanitize(b.bookingId)}</p>
            <p><strong>Appointment:</strong> ${sanitize(b.bookingDate)} at ${sanitize(b.timeSlot)}</p>
            <p><strong>Status:</strong> ${sanitize(b.bookingStatus)}</p>
            <p><strong>Payment Status:</strong> ${sanitize(b.paymentStatus)}</p>
            <p><strong>IHC Code:</strong> ${sanitize(b.ihcCode) || "N/A"}</p>
          </div>
        `;
        if (b.bookingStatus === "approved" && b.invoiceUrl) {
          const btn = document.createElement("button");
          btn.className = "btn btn-small invoice-btn";
          btn.textContent = "View Invoice";
          btn.onclick = () => {
            sessionStorage.setItem("selectedBookingId", sanitize(b.bookingId));
            window.location.href = "invoice.html";
          };
          li.appendChild(btn);
        }
        bookingList.appendChild(li);
      });

      const latest = userBookings[userBookings.length - 1];
      bookingStatusEl.textContent =
        latest.bookingStatus === "approved"
          ? "Booking Approved"
          : "Booking Approval Pending";
      invoiceBtn.style.display =
        latest.bookingStatus === "approved" && latest.invoiceUrl ? "inline-block" : "none";
      invoiceBtn.onclick = () => {
        sessionStorage.setItem("selectedBookingId", sanitize(latest.bookingId));
        window.location.href = "invoice.html";
      };
    } catch (err) {
      console.error(err);
      showMessage("Error loading bookings.");
    }
  };

  fetchUserData();
  fetchBookings();
});
