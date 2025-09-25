document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const msgDiv = document.getElementById("message");

  const togglePassword = document.getElementById("togglePassword");
  const eyeOpen = document.getElementById("eyeOpen");
  const eyeClosed = document.getElementById("eyeClosed");

  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    eyeOpen.classList.toggle("hidden");
    eyeClosed.classList.toggle("hidden");
  });

  const API_BASE = "https://ihc-portal.onrender.com";

  const showMessage = (message, isError = true) => {
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
  };

  const setLoading = (loading) => {
    loginBtn.disabled = loading;
    loginBtn.innerHTML = loading ? `Logging in <span class="spinner"></span>` : "Login";
  };

  const storeSession = (data, email) => {
    const { token, userId, fullName } = data;
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("userId", userId);
    sessionStorage.setItem("fullName", fullName);
    sessionStorage.setItem("email", email);

    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("fullName", fullName);
    localStorage.setItem("email", email);
  };

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return showMessage("Please enter both email and password.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) return showMessage(data.error || "Login failed.");

      storeSession(data, email);

      // Verify user
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (!meRes.ok) return showMessage("Error verifying user data.");

      showMessage("Login successful!", false);
      setTimeout(() => (window.location.href = "step2.html"), 1000);
    } catch (err) {
      console.error(err);
      showMessage("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  });
});
