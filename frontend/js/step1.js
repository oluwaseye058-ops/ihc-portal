document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");
  const submitButton = form.querySelector("button[type='submit']");

  const showMessage = (message, isError = true) => {
    const msgDiv = document.createElement("div");
    msgDiv.style = `position: fixed; top: 10px; right: 10px; padding: 10px; color: white; background: ${isError ? "red" : "green"}; border-radius: 5px; z-index: 1000;`;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  };

  const sanitize = (input) => input.replace(/[<>"'%;()&]/g, "");

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
      const response = await fetch("https://ihc-portal.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName, email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        showMessage(data.error || `Registration failed with status ${response.status}`);
        return;
      }

      const data = await response.json();
      if (!data.token || !data.userId) {
        showMessage("Invalid response from server.");
        return;
      }

      localStorage.setItem("token", data.token);
      sessionStorage.setItem("userId", data.userId);

      showMessage(data.existing ? "You are already registered. Redirecting to your portal..." : "Registration successful!", false);
      setTimeout(() => {
        window.location.href = "step2.html";
      }, 1000);
    } catch (err) {
      console.error("Error registering user:", {
        endpoint: "https://ihc-portal.onrender.com/api/register",
        error: err.message,
      });
      showMessage("Error connecting to server.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Register";
    }
  });
});