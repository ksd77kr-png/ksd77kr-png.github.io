document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const year = document.querySelector("[data-year]");
  const status = document.querySelector("[data-status]");
  const overlay = document.querySelector("[data-overlay]");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const canvas = document.getElementById("game-canvas");
  if (!canvas || typeof window.SnakeGame !== "function") {
    if (status) status.textContent = "Game unavailable.";
    if (overlay) overlay.querySelector("h3").textContent = "Game unavailable.";
    return;
  }

  const game = new window.SnakeGame({
    canvas,
    statusEl: status,
    overlayEl: overlay,
    scoreEl: document.querySelector("[data-score]"),
    highScoreEl: document.querySelector("[data-high-score]"),
    startButton: document.querySelector('[data-action="start"]'),
    pauseButton: document.querySelector('[data-action="pause"]'),
    restartButton: document.querySelector('[data-action="restart"]'),
    enemyButton: document.querySelector('[data-action="enemy"]'),
    controlButtons: Array.from(document.querySelectorAll(".pad-btn")),
  });

  window.addEventListener("beforeunload", () => game.destroy(), { once: true });
});
