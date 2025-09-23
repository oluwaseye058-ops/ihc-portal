document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!firstName || !lastName || !email || !password) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch("https://ihc-portal.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // ✅ Save JWT and userId for Step 2
        localStorage.setItem("token", data.token);
        sessionStorage.setItem("userId", data.userId);

        if (data.existing) {
          alert("You are already registered. Redirecting to your portal...");
        } else {
          alert("Registration successful!");
        }

        window.location.href = "step2.html"; // candidate dashboard
      } else {
        alert(data.error || "Registration failed. Try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    }
  });
});
