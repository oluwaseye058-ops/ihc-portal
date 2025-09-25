document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingList = document.getElementById("bookingList");
  const bookingStatusEl = document.getElementById("bookingStatus");
  const invoiceBtn = document.getElementById("invoiceBtn");
  const API_BASE = "https://ihc-portal.onrender.com";

  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";
  const showMessage = (msg, isError = true) => {
    const div = document.createElement("div");
    div.className = `message ${isError ? "error" : "success"}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId =
    sessionStorage.getItem("userId") || localStorage.getItem("userId");

  const handleExpired = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    showMessage("Session expired. Please login.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  if (!token || !userId) return handleExpired();

  // Optional: Check JWT expiry
  const parseJwt = (t) => { try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; } };
  const payload = parseJwt(token);
  if (!payload || payload.exp * 1000 < Date.now()) return handleExpired();

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    showMessage("Logged out!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  startBtn.addEventListener("click", () => (window.location.href = "step3.html"));

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
      if (!bookings.length) return (bookingList.innerHTML = "<li>No bookings</li>");

      bookings.forEach((b) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div>
            <p><strong>ID:</strong> ${sanitize(b.bookingId)}</p>
            <p><strong>Appointment:</strong> ${sanitize(b.bookingDate)} at ${sanitize(b.timeSlot)}</p>
            <p><strong>Status:</strong> ${sanitize(b.bookingStatus)}</p>
            <p><strong>Payment:</strong> ${sanitize(b.paymentStatus)}</p>
          </div>
        `;
        bookingList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      showMessage("Error loading bookings.");
    }
  };

  fetchUserData();
  fetchBookings();
});
