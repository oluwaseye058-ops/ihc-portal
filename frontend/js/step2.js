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

  let token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

  if (!token || !userId) {
    console.error("Step2: Missing token or userId", {
      tokenPresent: !!token,
      userIdPresent: !!userId,
      sessionKeys: Object.keys(sessionStorage),
      localStorageKeys: Object.keys(localStorage),
    });
    showMessage("Please login first.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  if (typeof token !== "string" || !token.includes(".") || token.trim() === "") {
    console.error("Step2: Invalid token format", {
      token: token ? token.slice(0, 10) + "..." : "undefined",
    });
    showMessage("Invalid session token. Please login again.");
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  console.log("Step2: Session data", {
    token: token.slice(0, 10) + "...",
    userId,
    fullName: sessionStorage.getItem("fullName") || localStorage.getItem("fullName"),
    email: sessionStorage.getItem("email") || localStorage.getItem("email"),
    currentDomain: window.location.hostname,
  });

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    showMessage("Logged out successfully!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  const viewInvoice = (booking) => {
    if (!booking) return;
    sessionStorage.setItem("selectedBookingId", sanitize(booking.bookingId));
    sessionStorage.setItem("selectedBooking", JSON.stringify(booking));
    window.location.href = "invoice.html";
  };

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

  // ✅ Improved fetchUserData
  const fetchUserData = async () => {
    try {
      const authHeader = `Bearer ${token}`;
      console.log("Step2: Sending GET /api/auth/me", {
        endpoint: `${API_BASE}/api/auth/me`,
        headers: { Authorization: authHeader.slice(0, 16) + "..." },
      });

      const statusRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (statusRes.status === 401) {
        console.warn("Step2: Session expired (401). Redirecting to login.");
        showMessage("Your session has expired. Please login again.");
        sessionStorage.clear();
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      if (!statusRes.ok) {
        const data = await statusRes.json().catch(() => ({}));
        console.error("Step2: Non-401 error fetching user data", {
          status: statusRes.status,
          error: data.error || data.message || "Unknown error",
        });
        showMessage("Could not load user info. Please try again later.");
        return;
      }

      const { user } = await statusRes.json();
      console.log("Step2: User data:", user);
      if (!user || !user._id) {
        showMessage("Invalid user data.");
        sessionStorage.clear();
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      welcomeEl.textContent = `Welcome ${sanitize(user.fullName) || "Registered User"}`;
      sessionStorage.setItem("userId", sanitize(user._id));
      sessionStorage.setItem("fullName", sanitize(user.fullName));
      sessionStorage.setItem("email", sanitize(user.email));
      localStorage.setItem("userId", sanitize(user._id));
      localStorage.setItem("fullName", sanitize(user.fullName));
      localStorage.setItem("email", sanitize(user.email));
      startBtn.disabled = false;
    } catch (err) {
      console.error("Step2: Error fetching user data:", err.message);
      showMessage("Error connecting to server. Please try again later.");
    }
  };

  // ✅ Improved fetchBookings
  const fetchBookings = async () => {
    try {
      const authHeader = `Bearer ${token}`;
      const bookingEndpoint = `${API_BASE}/api/booking/${userId}`;
      console.log("Step2: Sending GET /api/booking/:userId", {
        endpoint: bookingEndpoint,
        headers: { Authorization: authHeader.slice(0, 16) + "..." },
        domain: window.location.hostname,
      });

      const bookingRes = await fetch(bookingEndpoint, {
        method: "GET",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (bookingRes.status === 401) {
        console.warn("Step2: Session expired (401). Redirecting to login.");
        showMessage("Your session has expired. Please login again.");
        sessionStorage.clear();
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      if (!bookingRes.ok) {
        const data = await bookingRes.json().catch(() => ({}));
        console.error("Step2: Non-401 error fetching bookings", {
          status: bookingRes.status,
          error: data.error || data.message || "Unknown error",
        });
        showMessage("Could not load bookings. Please try again later.");
        return;
      }

      const bookingData = await bookingRes.json();
      console.log("Step2: Booking fetch response:", bookingData);

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

        bookingStatusEl.textContent =
          latest.bookingStatus === "approved"
            ? "Booking Approved"
            : "Booking Approval Pending – No invoice yet";

        paymentStatusEl.textContent = `Payment Status: ${sanitize(latest.paymentStatus) || "pending"}`;
        ihcCodeEl.textContent = latest.ihcCode ? `IHC Code: ${sanitize(latest.ihcCode)}` : "";
        invoiceBtn.style.display =
          latest.bookingStatus === "approved" && latest.invoiceUrl ? "inline-block" : "none";
        invoiceBtn.onclick = () => viewInvoice(latest);
      }
    } catch (err) {
      console.error("Step2: Error fetching bookings:", err.message);
      showMessage("Error loading bookings. Please try again later.");
    }
  };

  const init = async () => {
    if (window.location.hostname !== "ihc-portal-1.onrender.com") {
      console.warn("Step2: Domain mismatch", {
        expected: "ihc-portal-1.onrender.com",
        actual: window.location.hostname,
      });
      showMessage("Domain mismatch detected. Please use https://ihc-portal-1.onrender.com.");
    }
    await fetchUserData();
    await fetchBookings();
  };
  init();
});

//improved handling