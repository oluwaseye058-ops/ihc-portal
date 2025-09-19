// Step1.js – handles registration form submission

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const middleName = document.getElementById("middleName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!firstName || !lastName || !email) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch("https://ihc-portal.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName, email }),
      });

      const data = await response.json();

      if (response.status === 409) {
        alert("This email is already registered. Please use another email.");
        return;
      }

      if (data.success) {
        // Save userId in sessionStorage for Step 2
        sessionStorage.setItem("userId", data.userId);
        localStorage.setItem("userId", data.userId);
        window.location.href = "step2.html";
      } else {
        alert("Registration failed. Try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    }
  });
});

// NOTE: repo sync test 09/19/2025 23:19:43
