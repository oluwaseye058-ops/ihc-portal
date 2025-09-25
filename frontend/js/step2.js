document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingList = document.getElementById("bookingList");
  const bookingStatusEl = document.getElementById("bookingStatus");
  const invoiceBtn = document.getElementById("invoiceBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const API_BASE = "https://ihc-portal.onrender.com";

  // --- Helpers ---
  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";

  const showMessage = (msg, isError = true) => {
    const div = document.createElement("div");
    div.className = `message ${isError ? "error" : "success"}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const handleExpired = () => {
    sessionStorage.clear();
    localStorage.clear();
    showMessage("Session expired. Please login.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  // --- Session check ---
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

  if (!token || !userId) return handleExpired();

  const parseJwt = (t) => {
    try {
      return JSON.parse(atob(t.split(".")[1]));
    } catch {
      return null;
    }
  };
  const payload = parseJwt(token);
  if (!payload || payload.exp * 1000 < Date.now()) return handleExpired();

  // --- Logout handler ---
  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    showMessage("Logged out!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };
  logoutBtn?.addEventListener("click", logout);

  // --- Navigation ---
  startBtn.addEventListener("click", () => (window.location.href = "step3.html"));

  // --- Fetch user data ---
  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleExpired();
      if (!res.ok) return showMessage("Error fetching user data.");

      const { user } = await res.json();
      welcomeEl.textContent = `Welcome ${sanitize(user.fullName)}`;
      paymentStatusEl.textContent = `Payment Status: ${sanitize(user.paymentStatus) || "pending"}`;
      ihcCodeEl.textContent = user.ihcCode ? `IHC Code: ${sanitize(user.ihcCode)}` : "";
    } catch (err) {
      console.error(err);
      showMessage("Error connecting to server.");
    }
  };

  // --- Fetch bookings ---
  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleExpired();
      if (!res.ok) return showMessage("Error loading bookings.");

      const data = await res.json();
      const bookings = data.bookings || [];
      bookingList.innerHTML = "";
      invoiceBtn.style.display = "none";

      if (!bookings.length) {
        bookingList.innerHTML = "<li>No bookings</li>";
        return;
      }

      bookings.forEach((b) => {
        const li = document.createElement("li");
        li.classList.add("booking-item");
        li.innerHTML = `
          <div>
            <p><strong>Code:</strong> ${sanitize(b.bookingId)}</p>
            <p><strong>Appointment:</strong> ${sanitize(b.bookingDate)} at ${sanitize(b.timeSlot)}</p>
            <p><strong>Status:</strong> ${sanitize(b.bookingStatus)}</p>
            <p><strong>Payment:</strong> ${sanitize(b.paymentStatus)}</p>
          </div>
        `;

        // If booking not approved -> allow delete
        if (b.bookingStatus !== "approved") {
          const delBtn = document.createElement("button");
          delBtn.textContent = "Delete";
          delBtn.className = "btn btn-small logout-btn";
          delBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete this booking?")) return;
            try {
              const delRes = await fetch(`${API_BASE}/api/booking/${b._id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (delRes.status === 401) return handleExpired();

              if (!delRes.ok) {
                const errData = await delRes.json().catch(() => ({}));
                return showMessage(errData.error || `Error deleting booking (status ${delRes.status}).`);
              }

              showMessage("Booking deleted!", false);
              fetchBookings();
            } catch (err) {
              console.error(err);
              showMessage("Error deleting booking.");
            }
          });
          li.appendChild(delBtn);
        }

        // If booking approved -> show invoice button
        if (b.bookingStatus === "approved") {
          invoiceBtn.style.display = "inline-block";
          invoiceBtn.onclick = () => {
            window.location.href = `invoice.html?bookingId=${encodeURIComponent(b.bookingId)}`;
          };
        }

        bookingList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      showMessage("Error loading bookings.");
    }
  };

  // --- Init ---
  fetchUserData();
  fetchBookings();
});

//db
