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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = sanitize(document.getElementById("firstName").value.trim());
    const middleName = sanitize(document.getElementById("middleName").value.trim());
    const lastName = sanitize(document.getElementById("lastName").value.trim());
    const email = sanitize(document.getElementById("email").value.trim());
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return showMessage("Please fill in all required fields.");
    if (password.length < 8) return showMessage("Password must be at least 8 characters.");
    if (password !== confirmPassword) return showMessage("Passwords do not match.");

    submitButton.disabled = true;
    submitButton.textContent = "Registering...";

    try {
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
        return showMessage(data.error || `Registration failed`);
      }

      // Auto-login
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.token) return showMessage("Login after registration failed.");

      storeSession(loginData, email);
      showMessage("Registration successful!", false);
      setTimeout(() => (window.location.href = "step2.html"), 1000);
    } catch (err) {
      console.error(err);
      showMessage("Error connecting to server.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Register";
    }
  });
});
