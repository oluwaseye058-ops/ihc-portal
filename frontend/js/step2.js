document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingStatusEl = document.getElementById("bookingStatus");
  const invoiceBtn = document.getElementById("invoiceBtn");
  const bookingList = document.getElementById("bookingList");
  const API_BASE = "https://ihc-portal.onrender.com";

  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  };

  const sanitize = (input) => input.replace(/[<>"'%;()&]/g, "");

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");

  if (!token || !userId) {
    showMessage("Please login first.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("fullName");
    sessionStorage.removeItem("userId");
    showMessage("Logged out successfully!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  const viewInvoice = (booking) => {
    if (!booking) return;
    localStorage.setItem("selectedBookingId", sanitize(booking.bookingId));
    localStorage.setItem("selectedBooking", JSON.stringify(booking));
    window.location.href = "invoice.html";
  };

  // Add logout button if not present
  let logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.className = "logout-btn";
    logoutBtn.setAttribute("aria-label", "Log out of IHC Portal");
    logoutBtn.onclick = logout;
    welcomeEl.insertAdjacentElement("afterend", logoutBtn);
  }

  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    window.location.href = "step3.html";
  });

  const fetchUserData = async () => {
    try {
      const statusRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!statusRes.ok) {
        const data = await statusRes.json();
        showMessage(data.error || `Session expired: ${statusRes.status}`);
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      const { user } = await statusRes.json();
      if (!user || !user._id) {
        showMessage("Invalid user data.");
        return;
      }

      welcomeEl.textContent = `Welcome ${sanitize(user.fullName) || "Registered User"}`;
      localStorage.setItem("userId", sanitize(user._id));
      startBtn.disabled = false;
    } catch (err) {
      console.error("Error fetching user data:", {
        endpoint: `${API_BASE}/api/auth/me`,
        error: err.message,
      });
      welcomeEl.textContent = "Unable to fetch status. Please try again later.";
      showMessage("Error connecting to server.");
    }
  };

  const fetchBookings = async () => {
    try {
      const bookingRes = await fetch(`${API_BASE}/api/booking/${userId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!bookingRes.ok) {
        const data = await bookingRes.json();
        showMessage(data.error || `Failed to fetch bookings: ${bookingRes.status}`);
        return;
      }

      const bookingData = await bookingRes.json();
      const userBookings = bookingData.bookings || [];

      bookingList.innerHTML = "";
      if (userBookings.length === 0) {
        bookingList.innerHTML = "<li>No bookings found.</li>";
        bookingStatusEl.textContent = "No bookings yet.";
        invoiceBtn.style.display = "none";
      } else {
        const latest = userBookings[userBookings.length - 1];

        userBookings.forEach((b) => {
          const li = document.createElement("li");
          li.className = "booking-item";
          li.innerHTML = `
            <div>
              <p><strong>Booking ID:</strong> ${sanitize(b.bookingId) || "N/A"}</p>
              <p><strong>Appointment:</strong> ${sanitize(b.bookingDate)} at ${sanitize(b.timeSlot)}</p>
              <p><strong>Status:</strong> ${sanitize(b.bookingStatus) || "pendingApproval"}</p>
              <p><strong>Payment Status:</strong> ${sanitize(b.paymentStatus) || "pending"}</p>
              <p><strong>IHC Code:</strong> ${sanitize(b.ihcCode) || "N/A"}</p>
            </div>
          `;
          if (b.bookingStatus === "approved" && b.invoiceUrl) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn-small invoice-btn";
            btn.textContent = "View Invoice";
            btn.setAttribute("aria-label", `View invoice for booking ${b.bookingId}`);
            btn.onclick = () => viewInvoice(b);
            li.appendChild(btn);
          }
          bookingList.appendChild(li);
        });

        bookingStatusEl.textContent = latest.bookingStatus === "approved"
          ? "Booking Approved"
          : "Booking Approval Pending – No invoice yet";
        paymentStatusEl.textContent = `Payment Status: ${sanitize(latest.paymentStatus) || "pending"}`;
        ihcCodeEl.textContent = latest.ihcCode ? `IHC Code: ${sanitize(latest.ihcCode)}` : "";
        invoiceBtn.style.display = latest.bookingStatus === "approved" && latest.invoiceUrl ? "inline-block" : "none";
        invoiceBtn.onclick = () => viewInvoice(latest);
      }
    } catch (err) {
      console.error("Error fetching bookings:", {
        endpoint: `${API_BASE}/api/booking/${userId}`,
        error: err.message,
      });
      showMessage("Error loading bookings.");
    }
  };

  fetchUserData();
  fetchBookings();
});