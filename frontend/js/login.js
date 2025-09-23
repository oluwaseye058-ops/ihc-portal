document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
  
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }
  
      try {
        const response = await fetch("https://ihc-portal.onrender.com/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
  
        const data = await response.json();
  
        if (data.success) {
          // ✅ Save JWT and userId for portal
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.userId);
          localStorage.setItem("fullName", data.fullName);
  
          alert("Login successful!");
          window.location.href = "step2.html"; // redirect to portal
        } else {
          alert(data.error || "Login failed. Check your credentials.");
        }
      } catch (err) {
        console.error(err);
        alert("Server error during login. Please try again later.");
      }
    });
  });
  