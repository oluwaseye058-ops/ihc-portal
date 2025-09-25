document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  const submitButton = form.querySelector("button[type='submit']");
  const dateInput = document.getElementById("bookingDate");
  const API_BASE = "https://ihc-portal.onrender.com";

  const sanitize = (input) => input?.toString().replace(/[<>"'%;()&]/g, "") || "";
  const showMessage = (msg, isError = true) => {
    const div = document.createElement("div");
    div.className = `message ${isError ? "error" : "success"}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
  const fullName = sessionStorage.getItem("fullName");
  const email = sessionStorage.getItem("email");

  if (!token || !userId || !email) {
    showMessage("Session expired. Please login.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  const populateNameFields = (fullName) => {
    if (!fullName) return false;
    const parts = fullName.trim().split(" ");
    document.getElementById("firstName").value = sanitize(parts[0] || "");
    document.getElementById("middleName").value = sanitize(parts.length === 3 ? parts[1] : "");
    document.getElementById("lastName").value = sanitize(parts[parts.length - 1] || "");
    ["firstName", "middleName", "lastName"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.readOnly = true;
        el.classList.add("readonly");
      }
    });
    return true;
  };

  const fetchUserData = async () => {
    if (fullName && populateNameFields(fullName)) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showMessage(data.message || "Session expired.");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }
      const { user } = await res.json();
      if (!user || !user._id || !user.fullName || !user.email) {
        showMessage("Invalid user data.");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }
      if (populateNameFields(user.fullName)) {
        sessionStorage.setItem("fullName", sanitize(user.fullName));
        sessionStorage.setItem("email", sanitize(user.email));
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      showMessage("Failed to load user data.");
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.userId = userId;

    // Sanitize inputs
    Object.keys(data).forEach(key => data[key] = sanitize(data[key] || ""));

    const requiredFields = ["firstName", "lastName", "passportNumber", "nationality", "dob", "address", "sponsorCompany", "sponsorAirline", "bookingDate", "timeSlot"];
    for (const key of requiredFields) {
      if (!data[key]) {
        showMessage(`Please fill in the field: ${key}`);
        return;
      }
    }

    if (!/^[A-Z0-9]{6,12}$/.test(data.passportNumber)) {
      showMessage("Passport number must be 6-12 alphanumeric characters.");
      return;
    }
    if (!/^[A-Za-z\s-]+$/.test(data.nationality)) {
      showMessage("Nationality can only contain letters, spaces, or hyphens.");
      return;
    }
    if (data.dob >= today) {
      showMessage("Date of birth must be in the past.");
      return;
    }
    if (data.bookingDate < today) {
      showMessage("Booking date must be today or in the future.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      const res = await fetch(`${API_BASE}/api/booking/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        showMessage(error.message || `Booking failed with status ${res.status}`);
        return;
      }

      const result = await res.json();
      if (!result.booking?.bookingId) {
        showMessage("Invalid server response.");
        return;
      }

      sessionStorage.setItem("booking", JSON.stringify(result.booking));
      sessionStorage.setItem("selectedBookingId", sanitize(result.booking.bookingId));
      showMessage("Booking submitted successfully! Redirecting to payment...", false);
      setTimeout(() => {
        window.location.href = `step4.html?bookingId=${result.booking.bookingId}`;
      }, 1000);
    } catch (err) {
      console.error("Error submitting booking:", err);
      showMessage("Failed to submit booking. Try again later.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Proceed to Payment";
    }
  });

  fetchUserData();
});
