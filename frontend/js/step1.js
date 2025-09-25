document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");
  const submitButton = form.querySelector("button[type='submit']");
  const API_BASE = "https://ihc-portal.onrender.com";

  /** -------------------------------
   * Utility functions
   * ------------------------------- */

  // Display success or error messages
  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;

    // Add dismiss button for accessibility
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.className = "close-btn";
    closeBtn.setAttribute("aria-label", "Dismiss message");
    closeBtn.addEventListener("click", () => msgDiv.remove());
    msgDiv.appendChild(closeBtn);

    document.body.appendChild(msgDiv);
  };

  // Sanitize input (basic front-end cleanup)
  const sanitize = (input) => input.replace(/[<>"'%;()&]/g, "");

  // Store session details in storage
  const storeSession = (data, email) => {
    const { token, userId, fullName } = data;
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("userId", userId);
    sessionStorage.setItem("fullName", sanitize(fullName));
    sessionStorage.setItem("email", sanitize(email));

    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("fullName", sanitize(fullName));
    localStorage.setItem("email", sanitize(email));
  };

  // Toggle password visibility
  const toggleVisibility = (inputId, btnId, iconId) => {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);

    btn.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      if (icon) icon.classList.toggle("active", isHidden);
    });
  };

  toggleVisibility("password", "togglePassword", "eyeIconPassword");
  toggleVisibility("confirmPassword", "toggleConfirmPassword", "eyeIconConfirm");

  /** -------------------------------
   * Form submission
   * ------------------------------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = sanitize(document.getElementById("firstName").value.trim());
    const middleName = sanitize(document.getElementById("middleName").value.trim());
    const lastName = sanitize(document.getElementById("lastName").value.trim());
    const email = sanitize(document.getElementById("email").value.trim());
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Basic client-side validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return showMessage("Please fill in all required fields.");
    }
    if (password.length < 8) {
      return showMessage("Password must be at least 8 characters.");
    }
    if (password !== confirmPassword) {
      return showMessage("Passwords do not match.");
    }

    submitButton.disabled = true;
    submitButton.textContent = "Registering...";

    try {
      // Registration request
      const regResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
          email,
          password,
        }),
      });

      let regData;
      try {
        regData = await regResponse.json();
      } catch {
        regData = {};
      }

      if (!regResponse.ok) {
        return showMessage(regData.error || "Registration failed");
      }

      // Auto-login (unless register already returns token)
      if (regData.token && regData.userId) {
        storeSession(regData, email);
      } else {
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.token) {
          return showMessage("Login after registration failed.");
        }
        storeSession(loginData, email);
      }

      showMessage("Registration successful!", false);
      setTimeout(() => (window.location.href = "step2.html"), 1200);
    } catch (err) {
      console.error(err);
      showMessage("Error connecting to server.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Register";
    }
  });
});
