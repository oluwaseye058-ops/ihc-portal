// js/step3.js

document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const dateInput = document.getElementById("bookingDate");

  const fullName = localStorage.getItem("fullName");
  const userId = localStorage.getItem("userId");

  if (!userId || !fullName) {
    alert("Session expired. Please register again.");
    window.location.href = "step1.html";
    return;
  }

  // Split name into parts just for display (not for submission)
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] || "";
  const middleName = nameParts.length === 3 ? nameParts[1] : "";
  const lastName = nameParts[nameParts.length - 1] || "";

  // Populate display-only fields
  document.getElementById("firstName").value = firstName;
  document.getElementById("middleName").value = middleName;
  document.getElementById("lastName").value = lastName;

  // Lock fields to prevent editing
  ["firstName", "middleName", "lastName"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = true;
      el.classList.add("readonly"); // optional: style them grey
    }
  });

  // Disable past dates
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect only booking-related fields (exclude names)
    const formData = new FormData(bookingForm);
    const data = Object.fromEntries(formData.entries());

    const { bookingDate, timeSlot, passport, paymentMethod } = data;

    if (!bookingDate || !timeSlot || !passport) {
      alert("Please complete all required fields.");
      return;
    }

    try {
      const response = await fetch(
        `https://ihc-portal.onrender.com/api/booking/${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate,
            timeSlot,
            passport,
            paymentMethod,
          }), // ✅ names are NOT sent
        }
      );

      if (response.ok) {
        const result = await response.json();
        const bookingData = result.booking || data;
        localStorage.setItem("booking", JSON.stringify(bookingData));

        alert(
          "Booking submitted successfully!\nStaff has been notified via email.\nYou will see the invoice once your booking is approved. Keep an eye on your email."
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
