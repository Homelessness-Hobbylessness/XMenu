(() => {
  "use strict";

  // ── Helpers ──────────────────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // ── Redirect URL ──────────────────────────────────────────────────────────
  function getRedirectURL() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("returnTo") || params.get("redirect") || params.get("url") || document.referrer || "";
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (url.hostname === window.location.hostname && url.pathname === window.location.pathname) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  const REDIRECT_URL = getRedirectURL() || "https://xmenu.dev/";
  const VERIFICATION_KEY = "xmenu_verified";
  const VERIFICATION_EXPIRY_KEY = "xmenu_verification_expiry";
  const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  (function redirectIfAlreadyVerified() {
    try {
      const isVerified = sessionStorage.getItem(VERIFICATION_KEY) === "true";
      const expiry = parseInt(sessionStorage.getItem(VERIFICATION_EXPIRY_KEY) || "0", 10);
      if (isVerified && Date.now() < expiry && REDIRECT_URL) {
        window.location.replace(REDIRECT_URL);
      }
    } catch {
      // ignore storage errors and continue with challenge
    }
  })();

  // ── One simple question ───────────────────────────────────────────────────
  const QUESTIONS = [
    { text: "Was ist 3 + 4?",   choices: ["5", "6", "7"],    correct: 2 },
    { text: "Was ist 8 − 3?",   choices: ["4", "5", "6"],    correct: 1 },
    { text: "Was ist 2 × 5?",   choices: ["8", "10", "12"],  correct: 1 },
    { text: "Was ist 9 + 6?",   choices: ["13", "14", "15"], correct: 2 },
    { text: "Was ist 12 ÷ 4?",  choices: ["2", "3", "4"],    correct: 1 }
  ];

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const challengesEl     = $("#challenges");
  const successEl        = $("#success-screen");
  const questionText     = $("#question-text");
  const questionChoices  = $("#question-choices");
  const questionFeedback = $("#question-feedback");

  // ── Pick a random question ────────────────────────────────────────────────
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  questionText.textContent = q.text;

  q.choices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".choice-btn").forEach(b => { b.style.pointerEvents = "none"; });

      if (idx === q.correct) {
        btn.classList.add("correct");
        questionFeedback.textContent = "Richtig!";
        questionFeedback.className   = "feedback ok";
        setTimeout(showSuccess, 700);
      } else {
        btn.classList.add("wrong");
        questionFeedback.textContent = "Falsch – versuche es erneut.";
        questionFeedback.className   = "feedback err";
        setTimeout(() => {
          document.querySelectorAll(".choice-btn").forEach(b => {
            b.style.pointerEvents = "";
            b.classList.remove("wrong");
          });
          questionFeedback.textContent = "";
          questionFeedback.className   = "feedback";
        }, 900);
      }
    });
    questionChoices.appendChild(btn);
  });

  // ── Success / redirect ────────────────────────────────────────────────────
  function showSuccess() {
    try {
      sessionStorage.setItem(VERIFICATION_KEY, "true");
      sessionStorage.setItem(VERIFICATION_EXPIRY_KEY, String(Date.now() + VERIFICATION_TTL_MS));
    } catch {
      // ignore storage errors
    }

    challengesEl.style.display = "none";
    successEl.style.display    = "block";

    if (!REDIRECT_URL) {
      $(".redirect-note").textContent = "Keine Weiterleitungs-URL angegeben.";
      return;
    }

    try {
      $(".redirect-destination").textContent = new URL(REDIRECT_URL).hostname;
    } catch {
      $(".redirect-destination").textContent = REDIRECT_URL;
    }

    const bar   = $(".redirect-bar-fill");
    const note  = $(".redirect-note");
    const REDIRECT_DELAY_MS = 2000;
    const TICK  = 50;
    let elapsed = 0;

    const iv = setInterval(() => {
      elapsed += TICK;
      bar.style.width = Math.min((elapsed / REDIRECT_DELAY_MS) * 100, 100) + "%";
      const remaining = Math.ceil((REDIRECT_DELAY_MS - elapsed) / 1000);
      note.textContent = `Weiterleitung in ${remaining}s…`;
      if (elapsed >= REDIRECT_DELAY_MS) {
        clearInterval(iv);
        window.location.href = REDIRECT_URL;
      }
    }, TICK);
  }
})();
