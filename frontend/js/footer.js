document.addEventListener("DOMContentLoaded", () => {
    fetch("footer.html")
      .then((res) => res.text())
      .then((html) => {
        document.body.insertAdjacentHTML("beforeend", html);
      });
  });
  