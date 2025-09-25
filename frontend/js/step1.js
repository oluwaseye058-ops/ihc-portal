document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");
  const submitButton = form.querySelector("button[type='submit']");
  const API_BASE = "https://ihc-portal.onrender.com";

  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  };

  const sanitize = (input) => input.replace(/[<>"'%;()&]/g, "");

  // === Form submission ===
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = sanitize(document.getElementById("firstName").value.trim());
    const middleName = sanitize(document.getElementById("middleName").value.trim());
    const lastName = sanitize(document.getElementById("lastName").value.trim());
    const email = sanitize(document.getElementById("email").value.trim());
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[A-Za-z\s-]+$/;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showMessage("Please fill in all required fields.");
      return;
    }
    if (!emailRegex.test(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      showMessage("Names can only contain letters, spaces, or hyphens.");
      return;
    }
    if (password.length < 8) {
      showMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Registering...";

    try {
      // Register
      const regResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
          email,
          password,
        }),
      });

      if (!regResponse.ok) {
        const data = await regResponse.json();
        showMessage(data.error || `Registration failed with status ${regResponse.status}`);
        return;
      }

      // Auto-login after registration
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        const data = await loginResponse.json();
        showMessage(data.error || `Login failed with status ${loginResponse.status}`);
        return;
      }

      const loginData = await loginResponse.json();
      if (!loginData.token || !loginData.userId || !loginData.fullName) {
        showMessage("Invalid response from server.");
        return;
      }

      sessionStorage.setItem("token", loginData.token);
      sessionStorage.setItem("userId", loginData.userId);
      sessionStorage.setItem("fullName", sanitize(loginData.fullName));
      sessionStorage.setItem("email", sanitize(email));

      showMessage("Registration successful!", false);
      setTimeout(() => {
        window.location.href = "step2.html";
      }, 1000);
    } catch (err) {
      console.error("Error registering user:", {
        endpoint: `${API_BASE}/api/auth/register or /login`,
        error: err.message,
      });
      showMessage("Error connecting to server.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Register";
    }
  });

  // === Password toggle logic ===
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  const eyeIconPassword = document.getElementById("eyeIconPassword");

  const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const eyeIconConfirm = document.getElementById("eyeIconConfirm");

  function toggleVisibility(input, icon) {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    icon.innerHTML = isPassword
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.242-3.642m3.124-2.1A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.035 5.225M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
           d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
           d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
  }

  if (togglePassword) {
    togglePassword.addEventListener("click", () =>
      toggleVisibility(passwordInput, eyeIconPassword)
    );
  }

  if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener("click", () =>
      toggleVisibility(confirmPasswordInput, eyeIconConfirm)
    );
  }
});
