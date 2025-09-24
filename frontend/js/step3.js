document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  const submitButton = form.querySelector("button[type='submit']");
  const dateInput = document.getElementById("bookingDate");
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
    showMessage("Session expired. Please login again.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  // Disable past dates
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage(data.error || `Session expired: ${res.status}`);
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      const { user } = await res.json();
      if (!user || !user._id) {
        showMessage("Invalid user data.");
        return;
      }

      document.getElementById("firstName").value = sanitize(user.firstName) || "";
      document.getElementById("middleName").value = sanitize(user.middleName) || "";
      document.getElementById("lastName").value = sanitize(user.lastName) || "";
      ["firstName", "middleName", "lastName"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.readOnly = true;
          el.classList.add("readonly");
        }
      });
    } catch (err) {
      console.error("Error fetching user data:", {
        endpoint: `${API_BASE}/api/auth/me`,
        error: err.message,
      });
      showMessage("Error loading user data.");
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.userId = userId;

    // Sanitize inputs
    data.passportNumber = sanitize(data.passportNumber);
    data.nationality = sanitize(data.nationality);
    data.address = sanitize(data.address);
    data.sponsorCompany = sanitize(data.sponsorCompany);
    data.sponsorAirline = sanitize(data.sponsorAirline);

    // Validation
    const requiredFields = ["firstName", "lastName", "passportNumber", "nationality", "dob", "address", "sponsorCompany", "sponsorAirline", "bookingDate", "timeSlot"];
    for (const key of requiredFields) {
      if (!data[key]) {
        showMessage(`Please fill in the field: ${key}`);
        return;
      }
    }

    const passportRegex = /^[A-Z0-9]{6,12}$/;
    if (!passportRegex.test(data.passportNumber)) {
      showMessage("Passport number must be 6-12 alphanumeric characters.");
      return;
    }

    const nationalityRegex = /^[A-Za-z\s-]+$/;
    if (!nationalityRegex.test(data.nationality)) {
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
      const response = await fetch(`${API_BASE}/api/booking`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        showMessage(error.message || `Booking failed with status ${response.status}`);
        return;
      }

      const result = await response.json();
      const bookingData = result.booking || data;
      if (!result.bookingId) {
        showMessage("Invalid response from server.");
        return;
      }

      localStorage.setItem("booking", JSON.stringify(bookingData));
      localStorage.setItem("selectedBookingId", sanitize(result.bookingId));
      showMessage("Booking submitted successfully! Redirecting to payment...", false);
      setTimeout(() => {
        window.location.href = `step4.html?bookingId=${result.bookingId}`;
      }, 1000);
    } catch (err) {
      console.error("Error submitting booking:", {
        endpoint: `${API_BASE}/api/booking`,
        error: err.message,
      });
      showMessage("Failed to submit booking. Please try again later.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Proceed to Payment";
    }
  });

  fetchUserData();
});