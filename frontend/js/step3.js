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

  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");
  const fullName = sessionStorage.getItem("fullName");
  const email = sessionStorage.getItem("email");

  if (!token || !userId || !email) {
    showMessage("Session expired. Please login again.");
    setTimeout(() => (window.location.href = "login.html"), 1000);
    return;
  }

  // Disable past dates
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  const populateNameFields = (fullName) => {
    if (!fullName) return false;
    const nameParts = fullName.trim().split(" ");
    document.getElementById("firstName").value = sanitize(nameParts[0] || "");
    document.getElementById("middleName").value = sanitize(nameParts.length === 3 ? nameParts[1] : "");
    document.getElementById("lastName").value = sanitize(nameParts[nameParts.length - 1] || "");
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
    if (fullName && populateNameFields(fullName)) {
      console.log("✅ Populated names from sessionStorage:", fullName);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("API error:", { endpoint: `${API_BASE}/api/auth/me`, status: res.status, error: data });
        showMessage(data.error || `Session expired: ${res.status}`);
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      const { user } = await res.json();
      console.log("User data:", user);
      if (!user || !user._id || !user.fullName || !user.email) {
        showMessage("Invalid user data.");
        setTimeout(() => (window.location.href = "login.html"), 1000);
        return;
      }

      if (populateNameFields(user.fullName)) {
        sessionStorage.setItem("fullName", sanitize(user.fullName));
        sessionStorage.setItem("email", sanitize(user.email));
        console.log("✅ Populated names from API:", user.fullName);
      } else {
        showMessage("Unable to load user name. Please login again.");
        setTimeout(() => (window.location.href = "login.html"), 1000);
      }
    } catch (err) {
      console.error("Error fetching user data:", {
        endpoint: `${API_BASE}/api/auth/me`,
        error: err.message,
      });
      showMessage("Error loading user data. Please try again.");
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.userId = userId;

    // Sanitize inputs
    data.firstName = sanitize(data.firstName);
    data.middleName = sanitize(data.middleName || "");
    data.lastName = sanitize(data.lastName);
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
      const response = await fetch(`${API_BASE}/api/booking/${userId}`, {
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
      if (!result.booking.bookingId) {
        showMessage("Invalid response from server.");
        return;
      }

      sessionStorage.setItem("booking", JSON.stringify(bookingData));
      sessionStorage.setItem("selectedBookingId", sanitize(result.booking.bookingId));
      showMessage("Booking submitted successfully! Redirecting to payment...", false);
      setTimeout(() => {
        window.location.href = `step4.html?bookingId=${result.booking.bookingId}`;
      }, 1000);
    } catch (err) {
      console.error("Error submitting booking:", {
        endpoint: `${API_BASE}/api/booking/${userId}`,
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