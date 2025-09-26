// js/staff.js
document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#bookingsTable tbody");
    const messageEl = document.getElementById("message");
  
    const token = localStorage.getItem("token"); // staff JWT saved on login
  
    if (!token) {
      messageEl.innerHTML = `<p style="color:red;">Not authenticated. Please log in as staff.</p>`;
      return;
    }
  
    // Fetch all bookings
    async function loadBookings() {
      try {
        const res = await fetch("https://ihc-portal.onrender.com/api/staff/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || "Failed to load bookings");
        }
  
        tableBody.innerHTML = "";
        data.bookings.forEach((booking) => {
          const row = document.createElement("tr");
  
          row.innerHTML = `
            <td>${booking.bookingId}</td>
            <td>${booking.firstName} ${booking.lastName}</td>
            <td>${booking.email || ""}</td>
            <td>${booking.bookingDate} ${booking.timeSlot}</td>
            <td>${booking.paymentMethod || "-"}</td>
            <td>${booking.bookingStatus}</td>
            <td>
              <input type="url" placeholder="Invoice URL" 
                value="${booking.invoiceUrl || ""}" 
                data-id="${booking.bookingId}" 
                style="width: 250px;" />
              <button data-id="${booking.bookingId}">Save</button>
            </td>
          `;
  
          tableBody.appendChild(row);
        });
      } catch (err) {
        console.error("❌ Error loading bookings:", err);
        messageEl.innerHTML = `<p style="color:red;">Error loading bookings.</p>`;
      }
    }
  
    // Approve + save invoice URL
    async function saveInvoice(bookingId, invoiceUrl) {
      try {
        const res = await fetch(`https://ihc-portal.onrender.com/api/booking/${bookingId}/invoice`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ invoiceUrl }),
        });
  
        const data = await res.json();
        if (data.success) {
          messageEl.innerHTML = `<p style="color:green;">Invoice saved for ${bookingId}</p>`;
          loadBookings(); // refresh table
        } else {
          throw new Error(data.message || "Failed to save invoice");
        }
      } catch (err) {
        console.error("❌ Error saving invoice:", err);
        messageEl.innerHTML = `<p style="color:red;">Error saving invoice.</p>`;
      }
    }
  
    // Delegate save button clicks
    tableBody.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") {
        const bookingId = e.target.dataset.id;
        const input = tableBody.querySelector(`input[data-id="${bookingId}"]`);
        const invoiceUrl = input.value.trim();
  
        if (!invoiceUrl) {
          messageEl.innerHTML = `<p style="color:red;">Please enter an invoice URL.</p>`;
          return;
        }
  
        saveInvoice(bookingId, invoiceUrl);
      }
    });
  
    loadBookings();
  });
  