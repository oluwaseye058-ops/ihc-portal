document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const msgDiv = document.getElementById("message");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const capsWarning = document.getElementById("capsWarning");

  // Auto-select correct backend
  const API_BASE = window.location.hostname.includes("ihc-portal-1")
    ? "https://ihc-portal-1.onrender.com"
    : "https://ihc-portal.onrender.com";

  const showMessage = (message, isError = true) => {
    msgDiv.className = `message ${isError ? "error" : "success"}`;
    msgDiv.textContent = message;
  };

  const setLoading = (loading) => {
    if (loading) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = `Logging in <span class="spinner"></span>`;
    } else {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  };

  // Caps Lock detection
  passwordInput.addEventListener("keyup", (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      capsWarning.style.display = "block";
    } else {
      capsWarning.style.display = "none";
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      console.log("Login: Sending POST /api/auth/login", { email });

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("Login: Response", data);

      if (!res.ok) {
        showMessage(data.error || "Login failed. Please check your credentials.");
        return;
      }

      // Store only in sessionStorage
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("userId", data.userId);
      sessionStorage.setItem("fullName", data.fullName);
      sessionStorage.setItem("email", email);

      console.log("Login: Stored session data", {
        token: data.token.slice(0, 10) + "...",
        userId: data.userId,
        fullName: data.fullName,
        email,
        domain: window.location.hostname,
      });

      // Verify user
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!meRes.ok) {
        const meData = await meRes.json();
        console.error("Login: Fetch user data failed", {
          endpoint: `${API_BASE}/api/auth/me`,
          status: meRes.status,
          error: meData.error || meData.message,
        });
        showMessage("Error verifying user data.");
        return;
      }

      const { user } = await meRes.json();
      console.log("Login: User data", user);

      showMessage("Login successful!", false);
      setTimeout(() => (window.location.href = "step2.html"), 1000);
    } catch (err) {
      console.error("Login: Error", { error: err.message });
      showMessage("Error connecting to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  });

  // Toggle password visibility
  togglePasswordBtn.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === "password" ? "Show" : "Hide";
  });
});
