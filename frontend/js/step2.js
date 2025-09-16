// js/step2.js
let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

if (!userId) {
  alert("No user found. Please register first.");
  window.location.href = "step1.html";
}


document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");

  

  // ✅ Your old references preserved
  const welcomeEl = document.getElementById("welcomeMessage");
  const ihcCodeEl = document.getElementById("ihcCode");
  const paymentStatusEl = document.getElementById("paymentStatus");
  const startBtn = document.getElementById("startBooking");

  // ✅ New booking container
  const bookingList = document.getElementById("bookingList");

  if (!userId) {
    welcomeEl.textContent = "Error: No user found. Please register first.";
    return;
  }

  try {
    // ✅ Fetch user status
    const statusRes = await fetch(`/api/status/${userId}`);
    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      welcomeEl.textContent = `Error: ${statusData.error || "Unable to fetch status."}`;
      return;
    }

    // ✅ Populate your existing elements
    welcomeEl.textContent = `Welcome ${statusData.fullName || "Registered User"}`;
    paymentStatusEl.textContent = `Payment Status: ${statusData.paymentStatus}`;
    ihcCodeEl.textContent = `IHC Code: ${statusData.ihcCode || "Pending"}`;

    // ✅ Enable booking button if registration is complete (payment not required here yet)
    startBtn.disabled = false;
    startBtn.addEventListener("click", () => {
      window.location.href = "step3.html";
    });

    // ✅ Fetch bookings
    const bookingRes = await fetch(`/api/booking/${userId}`);
    const bookingData = await bookingRes.json();

    if (bookingRes.ok && bookingData.bookings && bookingData.bookings.length > 0) {
      bookingList.innerHTML = bookingData.bookings
        .map(
          (b) => `
            <li>
              <strong>Date:</strong> ${b.bookingDate} |
              <strong>Time:</strong> ${b.timeSlot} |
              <strong>Passport:</strong> ${b.passport}
            </li>
          `
        )
        .join("");
    } else {
      bookingList.innerHTML = "<li>No bookings found.</li>";
    }
  } catch (err) {
    console.error("Portal error:", err);
    welcomeEl.textContent = "Unable to fetch status. Please try again later.";
  }
});
