document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const submitButton = form.querySelector("button[type='submit']");
  const API_BASE = "https://ihc-portal.onrender.com/api/auth";

  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  };

  const sanitize = (input) => input.replace(/[<>"'%;()&]/g, "");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = sanitize(document.getElementById("email").value.trim());
    const password = document.getElementById("password").value;

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      showMessage("Please fill in all required fields.");
      return;
    }
    if (!emailRegex.test(email)) {
      showMessage("Please enter a valid email address.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      // Clear old session data
      sessionStorage.clear();

      // Login
      const loginRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        showMessage(data.error || `Login failed with status ${loginRes.status}`);
        return;
      }

      const loginData = await loginRes.json();
      if (!loginData.token || !loginData.userId || !loginData.fullName) {
        showMessage("Invalid response from server.");
        return;
      }

      // Fetch email from /api/auth/me
      const meRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${loginData.token}`, "Content-Type": "application/json" },
      });

      if (!meRes.ok) {
        const data = await meRes.json();
        showMessage(data.error || `Failed to fetch user data: ${meRes.status}`);
        return;
      }

      const meData = await meRes.json();
      if (!meData.user || !meData.user.email) {
        showMessage("Invalid user data.");
        return;
      }

      sessionStorage.setItem("token", loginData.token);
      sessionStorage.setItem("userId", loginData.userId);
      sessionStorage.setItem("fullName", sanitize(loginData.fullName));
      sessionStorage.setItem("email", sanitize(meData.user.email));

      showMessage("Login successful!", false);
      setTimeout(() => {
        window.location.href = "step2.html";
      }, 1000);
    } catch (err) {
      console.error("Error logging in user:", {
        endpoint: `${API_BASE}/login or /me`,
        error: err.message,
      });
      showMessage("Error connecting to server.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });
});