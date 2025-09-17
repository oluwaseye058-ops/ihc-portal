// js/step3.js

document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const dateInput = document.getElementById("bookingDate");

  // Disable past dates
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData.entries());

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("User not found. Please register first.");
      return;
    }

    // Check required fields
    for (const [key, value] of Object.entries(data)) {
      if (!value) {
        alert(`Please fill in the field: ${key}`);
        return;
      }
    }

    try {
      const response = await fetch(`https://ihc-portal.onrender.com/api/booking/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        const bookingData = result.booking || data;
        localStorage.setItem("booking", JSON.stringify(bookingData));

        // ✅ New: Show success message before redirect
        alert(
          "Booking submitted successfully!\nStaff has been notified via email.\nYou will see the invoice once your booking is approved. Keep an eye on your email"
        );

        window.location.href = "step4.html";
      } else {
        const error = await response.json();
        alert(`Failed to submit booking: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to submit booking. Please check your details or try again later.");
    }
  });
});
