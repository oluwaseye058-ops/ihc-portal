document.addEventListener("DOMContentLoaded", () => {
    const steps = document.querySelectorAll(".progress-step");
    const currentPage = window.location.pathname.split("/").pop();
  
    steps.forEach(step => {
      const stepFile = step.getAttribute("href");
  
      if (stepsCompleted(currentPage, stepFile)) {
        step.classList.add("completed");
      } else if (stepFile === currentPage) {
        step.classList.add("active");
      } else {
        step.style.pointerEvents = "none"; // disable future steps
        step.style.opacity = "0.5";
      }
    });
  });
  
  function stepsCompleted(currentPage, targetPage) {
    const order = ["step1.html","step2.html","step3.html","step4.html","step5.html"];
    return order.indexOf(targetPage) < order.indexOf(currentPage);
  }
  