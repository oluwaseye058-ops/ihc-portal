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
      sessionStorage.clear();

      const loginRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        console.error("Login: Login failed", {
          endpoint: `${API_BASE}/login`,
          status: loginRes.status,
          error: data.error,
        });
        showMessage(data.error || `Login failed with status ${loginRes.status}`);
        return;
      }

      const loginData = await loginRes.json();
      if (!loginData.token || !loginData.userId || !loginData.fullName) {
        console.error("Login: Invalid response", { response: loginData });
        showMessage("Invalid response from server.");
        return;
      }

      console.log("Login: Token received", { token: loginData.token.slice(0, 10) + "..." });

      // Verify token with GET /api/auth/me
      const meRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${loginData.token}`, "Content-Type": "application/json" },
      });

      if (!meRes.ok) {
        const data = await meRes.json();
        console.error("Login: Token verification failed", {
          endpoint: `${API_BASE}/me`,
          status: meRes.status,
          error: data.error,
        });
        showMessage(data.error || `Failed to verify user: ${meRes.status}`);
        return; // Stop here; do not store token or redirect
      }

      const meData = await meRes.json();
      if (!meData.user || !meData.user.email) {
        console.error("Login: Invalid user data", { response: meData });
        showMessage("Invalid user data.");
        return; // Stop here
      }

      // Store verified data
      sessionStorage.setItem("token", loginData.token);
      sessionStorage.setItem("userId", loginData.userId);
      sessionStorage.setItem("fullName", sanitize(loginData.fullName));
      sessionStorage.setItem("email", sanitize(meData.user.email));

      console.log("Login: Session storage updated", {
        userId: loginData.userId,
        fullName: loginData.fullName,
        email: meData.user.email,
        token: loginData.token.slice(0, 10) + "...",
      });

      showMessage("Login successful!", false);
      setTimeout(() => {
        window.location.href = "step2.html";
      }, 1000);
    } catch (err) {
      console.error("Login: Error connecting to server:", {
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