document.addEventListener("DOMContentLoaded", () => {
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");
  const bookingList = document.getElementById("bookingList");
  const logoutBtn = document.getElementById("logoutBtn");
  const messagesContainer = document.getElementById("messages");
  const API_BASE = "https://ihc-portal.onrender.com";

  const sanitize = (input) =>
    input?.toString().replace(/[<>"'%;()&]/g, "") || "";

  const showMessage = (msg, isError = true) => {
    if (!messagesContainer) return;
    const div = document.createElement("div");
    div.className = `message ${isError ? "error" : "success"}`;
    div.textContent = msg;

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => div.remove());
    div.appendChild(closeBtn);

    messagesContainer.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const handleExpired = () => {
    sessionStorage.clear();
    localStorage.clear();
    showMessage("Session expired. Please login.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };

  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId =
    sessionStorage.getItem("userId") || localStorage.getItem("userId");

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

  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    showMessage("Logged out!", false);
    setTimeout(() => (window.location.href = "login.html"), 1000);
  };
  logoutBtn?.addEventListener("click", logout);
  startBtn.addEventListener(
    "click",
    () => (window.location.href = "step3.html")
  );

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleExpired();
      if (!res.ok) return showMessage("Error fetching user data.");

      const { user } = await res.json();
      welcomeEl.textContent = `Welcome ${sanitize(user.fullName)}`;
      paymentStatusEl.textContent = `Payment Status: ${
        sanitize(user.paymentStatus) || "pending"
      }`;
      ihcCodeEl.textContent = user.ihcCode
        ? `IHC Code: ${sanitize(user.ihcCode)}`
        : "";
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

      if (!bookings.length) {
        bookingList.innerHTML = "<li>No bookings</li>";
        return;
      }

      bookings.forEach((b) => {
        const li = document.createElement("li");
        li.classList.add("booking-item");

        const selectedPayment = b.paymentMethod
          ? sanitize(b.paymentMethod)
          : "Not Selected";
        const paymentClass = b.paymentMethod ? "submitted" : "pending";

        li.innerHTML = `
          <div>
            <p><strong>Code:</strong> ${sanitize(b.bookingId)}</p>
            <p><strong>Appointment:</strong> ${sanitize(
              b.bookingDate
            )} at ${sanitize(b.timeSlot)}</p>
            <p><strong>Status:</strong> ${sanitize(b.bookingStatus)}</p>
            <p><strong>Payment Status:</strong> ${sanitize(
              b.paymentStatus
            )}</p>
            <p class="payment-method ${paymentClass}">
              <strong>Selected Payment:</strong> ${selectedPayment}
            </p>
          </div>
        `;

        // Allow delete if not approved
        if (b.bookingStatus !== "approved") {
          const delBtn = document.createElement("button");
          delBtn.textContent = "Delete";
          delBtn.className = "btn btn-small logout-btn";
          delBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!confirm("Are you sure you want to delete this booking?"))
              return;
            try {
              const delRes = await fetch(
                `${API_BASE}/api/booking/${b._id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (delRes.status === 401) return handleExpired();
              if (!delRes.ok) {
                const errData = await delRes.json().catch(() => ({}));
                return showMessage(
                  errData.error ||
                    `Error deleting booking (status ${delRes.status}).`
                );
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

        // Show invoice button if approved and invoiceUrl exists
        if (b.bookingStatus === "approved" && b.invoiceUrl) {
          const invoiceBtn = document.createElement("button");
          invoiceBtn.textContent = "View Invoice";
          invoiceBtn.className = "btn invoice-btn";
          invoiceBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.open(sanitize(b.invoiceUrl), "_blank");
          });
          li.appendChild(invoiceBtn);
        }

        // Always allow selecting booking to go to step4
        li.addEventListener("click", () => {
          sessionStorage.setItem("selectedBookingId", sanitize(b.bookingId));
          window.location.href = "step4.html";
        });

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
