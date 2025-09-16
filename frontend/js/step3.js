// js/step3.js

document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const dateInput = document.getElementById("bookingDate");

  // ✅ Disable past dates
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData.entries());

    // ✅ Get userId from localStorage (set at registration in step1)
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("User not found. Please register first.");
      return;
    }

    // ✅ Check required fields
    for (const [key, value] of Object.entries(data)) {
      if (!value) {
        alert(`Please fill in the field: ${key}`);
        return;
      }
    }

    try {
      // ✅ Send booking to backend with userId in URL
      const response = await fetch(`/api/booking/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
      
        // ✅ If backend didn’t return booking, fall back to submitted data
        const bookingData = result.booking || data;
      
        localStorage.setItem("booking", JSON.stringify(bookingData));
        window.location.href = "step4.html";
      }
       else {
        const error = await response.json();
        alert(`Failed to submit booking: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to submit booking. Please check your details or try again later.");
    }
  });
});
