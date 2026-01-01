const slides = document.querySelectorAll(".slide");
let index = 0;
let prevIndex = 0;
let onEndScreen = false;

const slideCounterEl = document.getElementById("slideCounter");
const slideCounterFillEl = slideCounterEl
  ? slideCounterEl.querySelector(".slide-counter__fill")
  : null;
function updateSlideCounter() {
  if (!slideCounterEl) return;
  const total = slides ? slides.length : 0;
  const current = Math.min(total, Math.max(1, index + 1));

  slideCounterEl.setAttribute("aria-valuemax", String(Math.max(1, total)));
  slideCounterEl.setAttribute("aria-valuenow", String(current));

  const pct = total > 0 ? (current / total) * 100 : 0;
  if (slideCounterFillEl) {
    slideCounterFillEl.style.width = `${pct}%`;
  }
}

// Mark the active slide as "long" when revealed content would overflow the viewport.
function updateActiveSlideLongness() {
  const active = document.querySelector(".slide.active");
  if (!active) return;
  active.classList.remove("long", "long2");

  const content = active.querySelector(".content");
  if (!content || content.classList.contains("hidden")) return;

  const rect = content.getBoundingClientRect();
  const topLimit = 24;
  const bottomLimit = window.innerHeight - 24;

  const overflowTop = Math.max(0, topLimit - rect.top);
  const overflowBottom = Math.max(0, rect.bottom - bottomLimit);
  const overflowPx = overflowTop + overflowBottom;

  // Detect "ugly wrapping": paragraphs/list items taking more than ~1.2 lines.
  let wrappedCount = 0;
  try {
    const candidates = content.querySelectorAll("p, li");
    for (const el of candidates) {
      const styles = window.getComputedStyle(el);
      let lineHeight = parseFloat(styles.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        // Many browsers report computed line-height as "normal".
        // Approximate it from font-size so wrapping detection still works.
        const fontSize = parseFloat(styles.fontSize);
        if (!Number.isFinite(fontSize) || fontSize <= 0) continue;
        lineHeight = fontSize * 1.25;
      }
      const h = el.getBoundingClientRect().height;
      if (h > lineHeight * 1.35) wrappedCount++;
      if (wrappedCount >= 3) break;
    }
  } catch (_) {}

  const wouldOverflow = overflowPx > 0;
  const looksWrapped = wrappedCount > 0;
  if (!wouldOverflow && !looksWrapped) return;

  // Two levels: long (mild) and long2 (more aggressive shrink)
  const isVeryLong = overflowPx >= 120 || wrappedCount >= 3;
  active.classList.add(isVeryLong ? "long2" : "long");
}

function showSlide(i) {
  if (!slides || !slides[i]) return;
  const direction = i > prevIndex ? "right" : "left";
  const leaving = slides[prevIndex];
  if (leaving) {
    leaving.classList.add(
      "leaving",
      // Flip exit direction to match expected arrow flow
      direction === "right" ? "exit-right" : "exit-left"
    );
    leaving.addEventListener(
      "animationend",
      () => {
        leaving.classList.remove("leaving", "exit-left", "exit-right");
      },
      { once: true }
    );
  }
  slides.forEach((s) =>
    s.classList.remove("active", "enter-left", "enter-right", "long", "long2")
  );
  slides[i].classList.add(
    "active",
    // Flip enter direction so next (→) slides in from left
    direction === "right" ? "enter-left" : "enter-right"
  );
  // Subtle whoosh on slide transition
  playWhoosh(direction);
  // Hide content and show reveal button for the active slide
  const activeSlide = slides[i];
  const content = activeSlide.querySelector(".content");
  const revealBtn = activeSlide.querySelector(".reveal-btn");
  if (content) content.classList.add("hidden");
  if (revealBtn) revealBtn.style.display = "block";
  prevIndex = i;
  updateSlideCounter();

  // Clear any prior long-slide sizing when switching slides.
  updateActiveSlideLongness();

  // Stop endless finale effects when leaving the end screens
  const endA = slides[slides.length - 1];
  onEndScreen = slides[i] === endA;
  if (!onEndScreen) {
    stopHeartRain();
  }
}

// Initial render
updateSlideCounter();

function nextSlide() {
  if (index < slides.length - 1) {
    // Next sound on navigating forward (SFX)
    playNextSFX();
    index++;
    showSlide(index);
  }
}

function prevSlide() {
  if (index > 0) {
    // Back sound on navigating backwards (SFX)
    playBackSFX();
    index--;
    showSlide(index);
  }
}

document.addEventListener("keydown", (e) => {
  // RTL: Right arrow navigates backward, Left arrow forward
  if (e.key === "ArrowRight") {
    e.preventDefault();
    prevSlide();
  }
  if (e.key === "ArrowLeft" || e.key === " ") {
    e.preventDefault();
    nextSlide();
  }
});

// Add button event listeners
function wireNavButtons(selector, { go, bubbleCount, confettiCount }) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      addRipple(e);
      playBoopSometimes();
      // vibrate(8);
      go();

      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      for (let i = 0; i < bubbleCount; i++) {
        bubbles.push(
          makeBubble(centerX + rand(-30, 30), centerY + rand(-30, 30), true)
        );
      }
      spawnConfetti(centerX, centerY, confettiCount);
      triggerDarken();
    });
  });
}

wireNavButtons(".prev-btn", {
  go: prevSlide,
  bubbleCount: 4,
  confettiCount: 8,
});
wireNavButtons(".next-btn", {
  go: nextSlide,
  bubbleCount: 12,
  confettiCount: 3,
});

// Press-and-hold reveal buttons (3s) with progress ring and reveal effects
function vibrate(pattern) {
  try {
    if (navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}
function triggerRevealForButton(btn) {
  const slide = btn.closest(".slide");
  const content = slide.querySelector(".content");
  if (content) {
    content.classList.remove("hidden");
    // Compute ripple origin from button center (percentage of viewport)
    const btnRect = btn.getBoundingClientRect();
    const centerX = btnRect.left + btnRect.width / 2;
    const centerY = btnRect.top + btnRect.height / 2;
    const xPct = Math.max(0, Math.min(100, (centerX / cw) * 100));
    const yPct = Math.max(0, Math.min(100, (centerY / ch) * 100));
    // Also compute transform-origin within content box for card growth
    const contentRect = content.getBoundingClientRect();
    const localXPct = Math.max(
      0,
      Math.min(100, ((centerX - contentRect.left) / contentRect.width) * 100)
    );
    const localYPct = Math.max(
      0,
      Math.min(100, ((centerY - contentRect.top) / contentRect.height) * 100)
    );
    try {
      content.style.setProperty("--ripple-x", `${xPct}%`);
      content.style.setProperty("--ripple-y", `${yPct}%`);
      content.style.setProperty("--card-origin-x", `${localXPct}%`);
      content.style.setProperty("--card-origin-y", `${localYPct}%`);
    } catch (_) {}
    // next frame to allow transition; add ripple-in alongside show and grow
    requestAnimationFrame(() =>
      content.classList.add("show", "ripple-in", "grow-in")
    );
    // After ripple completes, start continuous bobbing
    const onAnimEnd = (e) => {
      if (e.animationName === "content-ripple") {
        // Start bobbing; when grow-in is active too, CSS runs both animations together
        content.classList.add("bob-loop");
        content.removeEventListener("animationend", onAnimEnd);
      }
    };
    content.addEventListener("animationend", onAnimEnd);
    const rect = btn.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
    // Removed synthetic audio cues (spark/bell/pop). Keep only MP3-based boom.
    vibrate([20, 50, 20]);
    btn.style.display = "none";

    // After layout settles, decide if this slide needs smaller text.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateActiveSlideLongness();
      });
    });
  }
}

document.querySelectorAll(".reveal-btn").forEach((btn) => {
  let holding = false;
  let holdStart = 0;
  let holdRAF = null;
  let holdIndicator = null;
  let milestone = 0; // for haptic progress pulses
  const required = 3000; // 3 seconds
  let holdCompleted = false;

  // Managed boom instance for hold lifecycle
  let holdBoomAudio = null;
  function startHoldBoom() {
    try {
      // If a previous instance is still referenced, stop it first
      if (holdBoomAudio) {
        try {
          holdBoomAudio.pause();
        } catch (_) {}
        holdBoomAudio = null;
      }
      const a = new Audio("audio/boom.mp3");
      a.preload = "auto";
      a.volume = 1;
      a.currentTime = 0;
      a.play().catch(() => {});
      a.addEventListener(
        "ended",
        () => {
          // Clear reference when it naturally finishes
          if (holdBoomAudio === a) holdBoomAudio = null;
        },
        { once: true }
      );
      holdBoomAudio = a;
    } catch (_) {}
  }
  function stopHoldBoom(reset = true) {
    try {
      if (holdBoomAudio) {
        try {
          holdBoomAudio.pause();
          if (reset) holdBoomAudio.currentTime = 0;
        } catch (_) {}
        holdBoomAudio = null;
      }
    } catch (_) {}
  }

  const cleanupHold = (completed = false) => {
    holding = false;
    // Stop global shake
    try {
      document.body.classList.remove("hold-shake");
      document.body.style.removeProperty("--shake-amp");
      document.body.style.removeProperty("--shake-rot");
      document.body.style.removeProperty("--shake-speed");
    } catch (_) {}
    if (holdIndicator) {
      holdIndicator.remove();
      holdIndicator = null;
    }
    if (holdRAF) {
      cancelAnimationFrame(holdRAF);
      holdRAF = null;
    }
    // If user canceled early, stop the boom; on completion let it finish
    if (!completed) {
      stopHoldBoom(true);
    }
    // Reset button transform
    btn.style.transform = "";
  };

  const loop = () => {
    if (!holding) return;
    const p = Math.min(1, (performance.now() - holdStart) / required);
    const deg = Math.floor(p * 360);
    if (holdIndicator) {
      holdIndicator.style.backgroundImage = `conic-gradient(var(--accent) ${deg}deg, rgba(255,255,255,0.12) 0deg)`;
    }
    // Drive global shake intensity and speed via CSS variables
    try {
      const amp = 1 + p * 9; // 1 -> 10 px multiplier
      const rot = 0.2 + p * 1.3; // 0.2 -> 1.5 deg multiplier
      const speedMs = Math.max(28, 70 - p * 40); // faster at higher progress
      document.body.style.setProperty("--shake-amp", amp.toFixed(2));
      document.body.style.setProperty("--shake-rot", rot.toFixed(2));
      document.body.style.setProperty(
        "--shake-speed",
        `${speedMs.toFixed(0)}ms`
      );
    } catch (_) {}
    // Aggressive shake that intensifies with progress
    const shakeIntensity = p * 20; // 0 to 20 pixels - VIOLENT
    const shakeSpeed = 10 + p * 35; // faster as progress increases
    const shakeX =
      Math.sin(performance.now() / (50 - shakeSpeed)) * shakeIntensity;
    const shakeY =
      Math.cos(performance.now() / (60 - shakeSpeed)) * shakeIntensity * 0.8;
    const shakeRot = Math.sin(performance.now() / (40 - shakeSpeed)) * p * 8; // up to 8 degrees
    btn.style.transform = `translateZ(20px) translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg) scale(${
      1 - p * 0.05
    })`;

    // Haptic feedback milestones at ~33% and ~66%
    if (p >= 0.33 && milestone < 1) {
      vibrate(12);
      milestone = 1;
    }
    if (p >= 0.66 && milestone < 2) {
      vibrate([8, 60, 8]);
      milestone = 2;
    }
    if (p >= 1) {
      holdCompleted = true;
      cleanupHold(true);
      vibrate([50, 100, 50, 100, 50]);
      triggerRevealForButton(btn);
      // Removed synthetic success chime; keep visual effects only
      // MASSIVE EXPLOSION EFFECT
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // HUGE confetti burst - multiple waves (increased)
      spawnConfetti(centerX, centerY, 90);
      setTimeout(() => spawnConfetti(centerX, centerY, 50), 100);
      setTimeout(() => spawnConfetti(centerX, centerY, 40), 200);
      // Massive bubble explosion
      for (let i = 0; i < 100; i++) {
        bubbles.push(
          makeBubble(centerX + rand(-150, 150), centerY + rand(-150, 150), true)
        );
      }
      // Heart burst - huge
      for (let i = 0; i < 30; i++) {
        hearts.push(
          makeHeart(centerX + rand(-180, 180), centerY + rand(-180, 180))
        );
      }
      // Sparkle explosion - massive
      for (let i = 0; i < 60; i++) {
        sparkles.push(
          makeSparkle(centerX + rand(-200, 200), centerY + rand(-200, 200))
        );
      }
      // COLOR BURST FLASH
      triggerColorBurst();
      // Extra hearts rain on final slide
      const slideEl = btn.closest(".slide");
      if (slideEl && slides) {
        const endA = slides[slides.length - 1];
        if (slideEl === endA) {
          startHeartRain(Infinity);
        }
      }
      return;
    }
    holdRAF = requestAnimationFrame(loop);
  };

  btn.addEventListener("pointerdown", (e) => {
    addRipple(e);
    // Start the managed boom when hold begins
    holdCompleted = false;
    startHoldBoom();
    // Begin global shake effect while holding
    try {
      document.body.classList.add("hold-shake");
      // Initialize baseline shake variables
      document.body.style.setProperty("--shake-amp", "1");
      document.body.style.setProperty("--shake-rot", "0.2");
      document.body.style.setProperty("--shake-speed", "70ms");
    } catch (_) {}
    // start hold tracking
    holding = true;
    holdStart = performance.now();
    holdIndicator = document.createElement("span");
    holdIndicator.className = "hold-indicator";
    btn.appendChild(holdIndicator);
    // initial haptic tap
    vibrate(10);
    loop();
  });
  const cancelers = ["pointerup", "pointerleave", "pointercancel"];
  cancelers.forEach((evt) =>
    btn.addEventListener(evt, () => {
      // If the hold already completed, don't stop the boom on release
      if (holdCompleted) return;
      cleanupHold(false);
    })
  );

  btn.addEventListener(
    "touchstart",
    (e) => {
      // Don't prevent default - let pointerdown handle it
      const rect = btn.getBoundingClientRect();
      for (let i = 0; i < 12; i++) {
        hearts.push(
          makeHeart(
            rect.left + rand(-30, rect.width + 30),
            rect.top + rand(-30, rect.height + 30)
          )
        );
      }
    },
    { passive: true }
  );
});

// Basic touch swipe navigation
let touchStartX = null;
let touchStartY = null;
let touchStartTarget = null;
let lastTouchParticleTime = 0;
const threshold = 60; // px - increased for better mobile UX
document.addEventListener(
  "touchstart",
  (e) => {
    if (!e.touches[0]) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTarget = e.target;
  },
  { passive: true }
);

// Create particles while dragging on mobile
document.addEventListener(
  "touchmove",
  (e) => {
    if (!e.touches[0]) return;
    const now = performance.now();
    // Throttle particle creation to every 50ms
    if (now - lastTouchParticleTime < 50) return;
    lastTouchParticleTime = now;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Don't create particles if touching buttons
    if (
      touchStartTarget &&
      (touchStartTarget.classList.contains("reveal-btn") ||
        touchStartTarget.classList.contains("nav-btn") ||
        touchStartTarget.closest(".reveal-btn") ||
        touchStartTarget.closest(".nav-btn"))
    ) {
      return;
    }

    // Spawn bubbles along the drag path
    if (!onEndScreen) {
      for (let i = 0; i < 3; i++) {
        bubbles.push(makeBubble(x + rand(-15, 15), y + rand(-15, 15), true));
      }
    }

    // Spawn sparkles occasionally
    if (Math.random() < 0.2) {
      sparkles.push(makeSparkle(x + rand(-20, 20), y + rand(-20, 20)));
    }

    // Spawn hearts occasionally
    if (Math.random() < 0.1) {
      hearts.push(makeHeart(x + rand(-25, 25), y + rand(-25, 25)));
    }
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (e) => {
    if (touchStartX === null) return;
    // Don't swipe if started on a button
    if (
      touchStartTarget &&
      (touchStartTarget.classList.contains("reveal-btn") ||
        touchStartTarget.classList.contains("nav-btn") ||
        touchStartTarget.closest(".reveal-btn") ||
        touchStartTarget.closest(".nav-btn"))
    ) {
      touchStartX = null;
      touchStartY = null;
      touchStartTarget = null;
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    // Only swipe if horizontal movement is dominant and exceeds threshold
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > threshold) {
      if (dx < 0) nextSlide();
      else prevSlide();
    }
    touchStartX = null;
    touchStartY = null;
    touchStartTarget = null;
  },
  { passive: true }
);

// Bubble particle background
const canvas = document.getElementById("bubbleCanvas");
const ctx = canvas.getContext("2d");
let bubbles = [];
let confetti = [];
const isMobile =
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.innerWidth <= 640;
let dpr = Math.max(1, window.devicePixelRatio || 1);
let cw = 0,
  ch = 0;
let pointerX = null,
  pointerY = null;
let lastPointerSpawn = 0;
let turboMode = false;
let sparkles = [];
let stars = [];
let snowflakes = [];
let hearts = [];
// Fireworks removed for performance
let lastClickTime = 0;
let snowTarget = 30;

// Adaptive quality + FPS tracking
// Performance safeguards removed: no adaptive quality, caps, or frame skipping

function resizeCanvas() {
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // adjust bubble count based on area
  let base = Math.max(26, Math.floor((cw * ch) / 42000));
  if (turboMode) base *= 1.5;
  const target = Math.min(90, Math.floor(base));
  while (bubbles.length < target) bubbles.push(makeBubble());
  if (bubbles.length > target) bubbles.length = target;
  // stars
  let starTarget = Math.max(6, Math.floor((cw * ch) / 140000));
  starTarget = Math.min(22, starTarget);
  while (stars.length < starTarget) stars.push(makeStar());
  if (stars.length > starTarget) stars.length = starTarget;
  // snowflakes
  snowTarget = Math.max(10, Math.floor((cw * ch) / 90000));
  snowTarget = Math.min(36, snowTarget);
  while (snowflakes.length < snowTarget) snowflakes.push(makeSnowflake());
  if (snowflakes.length > snowTarget) snowflakes.length = snowTarget;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseCssColorToRgb(input) {
  if (!input) return null;
  const s = String(input).trim();

  // #RGB / #RRGGBB
  if (s[0] === "#") {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }
    return null;
  }

  // rgb()/rgba()
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1]
      .split(",")
      .map((p) => p.trim())
      .slice(0, 3)
      .map((p) => Number.parseFloat(p));
    if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) return null;
    return {
      r: clamp(parts[0], 0, 255),
      g: clamp(parts[1], 0, 255),
      b: clamp(parts[2], 0, 255),
    };
  }

  return null;
}

function rgbToHsl({ r, g, b }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

function averageHue(h1, h2) {
  const a1 = (h1 * Math.PI) / 180;
  const a2 = (h2 * Math.PI) / 180;
  const x = Math.cos(a1) + Math.cos(a2);
  const y = Math.sin(a1) + Math.sin(a2);
  const a = Math.atan2(y, x);
  let deg = (a * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

let bubbleHueSplitA = 210;
let bubbleHueSplitB = 330;

function updateBubbleSplitPalette() {
  try {
    const style = getComputedStyle(document.documentElement);
    const c2 = style.getPropertyValue("--accent-2").trim();
    const c3 = style.getPropertyValue("--accent-3").trim();
    const rgb2 = parseCssColorToRgb(c2);
    const rgb3 = parseCssColorToRgb(c3);
    if (!rgb2 || !rgb3) return;
    const h2 = rgbToHsl(rgb2).h;
    const h3 = rgbToHsl(rgb3).h;
    const base = averageHue(h2, h3);
    bubbleHueSplitA = (base + 150) % 360;
    bubbleHueSplitB = (base + 210) % 360;

    // Refresh existing bubbles so palette changes are immediate
    for (let i = 0; i < bubbles.length; i++) {
      bubbles[i].hue =
        (Math.random() < 0.5 ? bubbleHueSplitA : bubbleHueSplitB) +
        rand(-12, 12);
    }
  } catch (_) {}
}

function makeBubble(x, y, burst = false) {
  const r = burst ? rand(12, 26) : rand(10, 28);
  return {
    x: x !== undefined ? x : rand(0, cw),
    y: y !== undefined ? y : rand(ch * 0.6, ch + 50),
    r,
    vy: burst ? -rand(1.0, 2.2) : -rand(0.25, 1.15),
    vx: burst ? rand(-1.0, 1.0) : rand(-0.4, 0.4),
    alpha: burst ? rand(0.7, 1) : rand(0.35, 0.85),
    // Split-complementary hues derived from the current background
    hue:
      (Math.random() < 0.5 ? bubbleHueSplitA : bubbleHueSplitB) + rand(-12, 12),
  };
}

function drawBubble(b) {
  const grd = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
  // Split-complementary bubbles against the BG
  grd.addColorStop(0, `hsla(${b.hue}, 58%, 76%, ${b.alpha})`);
  grd.addColorStop(1, `hsla(${b.hue}, 58%, 62%, ${b.alpha * 0.35})`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  ctx.clearRect(0, 0, cw, ch);
  // bubbles
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    if (pointerX !== null) {
      const dx = pointerX - b.x;
      const dy = pointerY - b.y;
      const dist = Math.hypot(dx, dy) + 0.001;
      const force = Math.min(turboMode ? 0.18 : 0.12, 18 / dist);
      b.vx += (dx / dist) * force * 0.15;
      b.vy += (dy / dist) * force * 0.08;
    }
    b.y += b.vy;
    b.x += b.vx;
    b.alpha *= 0.9995;
    drawBubble(b);
    if (b.y < -40 || b.x < -40 || b.x > cw + 40 || b.alpha < 0.08) {
      bubbles[i] = makeBubble();
    }
  }
  // confetti
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.vy += 0.008; // gravity
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.vr;
    drawConfetti(c);
    if (c.y > ch + 80) confetti.splice(i, 1);
  }
  // sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.002;
    s.alpha *= 0.96;
    drawSparkle(s);
    if (s.alpha < 0.05) sparkles.splice(i, 1);
  }
  // stars
  for (let s of stars) {
    s.twinkle += s.twinkleSpeed;
    drawStar(s);
  }
  // snowflakes
  for (let i = snowflakes.length - 1; i >= 0; i--) {
    const s = snowflakes[i];
    s.x += s.vx;
    s.y += s.vy;
    s.rot += s.vr;
    drawSnowflake(s);
    if (s.y > ch + 50) snowflakes.splice(i, 1);
  }
  while (snowflakes.length < snowTarget) snowflakes.push(makeSnowflake());
  // hearts
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    // Legacy: if any hearts are still marked as tornado, convert them into rain.
    if (h.tornado) {
      h.tornado = false;
      h.vx = rand(-0.4, 0.4);
      h.vy = rand(1.0, 2.4);
      h.windSeed = Math.random() * 1000;
      h.terminalVy = rand(3.6, 5.4);
    }

    // Heart rain physics: gravity + wind + terminal velocity.
    const t = performance.now() * 0.001;
    const windSeed = h.windSeed ?? 0;
    // Two blended sine waves gives “gusty” wind without heavy math.
    const wind =
      (Math.sin(t * 0.7 + windSeed) * 0.7 +
        Math.sin(t * 1.35 + windSeed * 0.33) * 0.3) *
      0.35;
    h.vx += (wind - h.vx) * 0.02;
    h.vy += 0.03;
    const terminalVy = h.terminalVy ?? 4.8;
    if (h.vy > terminalVy) h.vy = terminalVy;
    h.x += h.vx;
    h.y += h.vy;
    drawHeart(h);
    // Don't fade out hearts; only remove once they leave the screen
    if (h.y > ch + 80 || h.x < -120 || h.x > cw + 120) hearts.splice(i, 1);
  }
  // random heart spawn
  if (Math.random() < 0.005) {
    for (let i = 0; i < rand(2, 4); i++) {
      hearts.push(makeHeart(rand(0, cw), rand(0, ch)));
    }
  }
  requestAnimationFrame(animate);
}

function spawnBurst(x, y) {
  const rect = { left: 0, top: 0 };
  const gx = x - rect.left;
  const gy = y - rect.top;
  for (let i = 0; i < 25; i++) {
    bubbles.push(makeBubble(gx + rand(-20, 20), gy + rand(-10, 10), true));
  }
}

function spawnConfetti(x, y, count = 40) {
  for (let i = 0; i < count; i++) {
    confetti.push(makeConfetti(x + rand(-16, 16), y + rand(-12, 12)));
  }
}

function makeConfetti(x, y) {
  const size = rand(6, 16);
  return {
    x,
    y,
    w: size,
    h: size * rand(0.6, 1.2),
    hue: rand(0, 360),
    alpha: rand(0.7, 1),
    vx: rand(-1.4, 1.4),
    vy: rand(-2.2, -0.6),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.05, 0.05),
  };
}

function drawConfetti(c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rot);
  ctx.fillStyle = `hsla(${c.hue}, 85%, 60%, ${c.alpha})`;
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.restore();
}

function makeSparkle(x, y) {
  return {
    x,
    y,
    vx: rand(-0.8, 0.8),
    vy: rand(-1.2, -0.2),
    size: rand(2, 4),
    alpha: rand(0.6, 1),
    hue: rand(180, 330),
  };
}
function drawSparkle(s) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = `hsla(${s.hue}, 90%, 70%, ${s.alpha})`;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function makeStar() {
  return {
    x: rand(0, cw),
    y: rand(0, ch),
    size: rand(2, 6),
    alpha: rand(0.3, 0.8),
    twinkle: rand(0, Math.PI * 2),
    twinkleSpeed: rand(0.01, 0.05),
  };
}

function drawStar(s) {
  ctx.save();
  ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
  ctx.fillStyle = `hsla(50, 80%, 80%, ${ctx.globalAlpha})`;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const x = s.x + Math.cos(angle) * s.size;
    const y = s.y + Math.sin(angle) * s.size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function makeSnowflake() {
  return {
    x: rand(0, cw),
    y: rand(-50, 0),
    vx: rand(-0.5, 0.5),
    vy: rand(0.5, 1.5),
    size: rand(3, 8),
    alpha: rand(0.6, 0.9),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.02, 0.02),
  };
}

function drawSnowflake(s) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = `hsla(0, 0%, 100%, ${s.alpha})`;
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * s.size, Math.sin(angle) * s.size);
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(angle + Math.PI / 6) * s.size * 0.5,
      Math.sin(angle + Math.PI / 6) * s.size * 0.5
    );
  }
  ctx.strokeStyle = `hsla(0, 0%, 100%, ${s.alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function makeHeart(x, y, size) {
  return {
    x,
    y,
    vx: rand(-1, 1),
    vy: rand(-2, -0.5),
    size: size || rand(8, 15),
    alpha: rand(0.7, 1),
    hue: rand(320, 360),
  };
}

function drawHeart(h) {
  ctx.save();
  ctx.globalAlpha = h.alpha;
  ctx.fillStyle = `hsla(${h.hue}, 90%, 70%, ${h.alpha})`;
  ctx.beginPath();
  const topCurveHeight = h.size * 0.3;
  ctx.moveTo(h.x, h.y + topCurveHeight);
  ctx.bezierCurveTo(
    h.x,
    h.y,
    h.x - h.size / 2,
    h.y,
    h.x - h.size / 2,
    h.y + topCurveHeight
  );
  ctx.bezierCurveTo(
    h.x - h.size / 2,
    h.y + (h.size + topCurveHeight) / 2,
    h.x,
    h.y + (h.size + topCurveHeight) / 2,
    h.x,
    h.y + h.size
  );
  ctx.bezierCurveTo(
    h.x,
    h.y + (h.size + topCurveHeight) / 2,
    h.x + h.size / 2,
    h.y + (h.size + topCurveHeight) / 2,
    h.x + h.size / 2,
    h.y + topCurveHeight
  );
  ctx.bezierCurveTo(h.x + h.size / 2, h.y, h.x, h.y, h.x, h.y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Heart rain effect for finales
let heartRainTimer = null;
let heartRainActive = false;

function startHeartRain(duration = 3000) {
  stopHeartRain();
  heartRainActive = true;

  const start = performance.now();
  const infinite = duration === Infinity || duration === null;

  const spawn = () => {
    if (!heartRainActive) return;
    const nowTs = performance.now();
    if (!infinite && nowTs - start > duration) {
      stopHeartRain();
      return;
    }
    for (let i = 0; i < 1; i++) {
      const x = rand(0, cw);
      const size = rand(20, 44);
      hearts.push({
        x,
        y: -20,
        // Start slightly different per drop so it feels like real rain
        vx: rand(-0.2, 0.2),
        vy: rand(0.8, 1.8),
        windSeed: Math.random() * 1000,
        terminalVy: rand(3.6, 5.4),
        size,
        alpha: rand(0.8, 1),
        hue: rand(330, 360),
      });
    }
    heartRainTimer = setTimeout(spawn, 130);
  };
  spawn();
}

function stopHeartRain() {
  heartRainActive = false;
  if (heartRainTimer) {
    clearTimeout(heartRainTimer);
    heartRainTimer = null;
  }
}

function startHeartTornado(duration = Infinity) {
  // Kept for backwards compatibility: tornado effect was replaced with rain.
  startHeartRain(duration);
}

// makeFirework/drawFirework removed

// pointer/touch interactivity: track and spawn micro bubbles
const pointerHandler = (clientX, clientY) => {
  pointerX = clientX;
  pointerY = clientY;
  const now = performance.now();
  if (!onEndScreen && now - lastPointerSpawn > 40) {
    bubbles.push(makeBubble(clientX, clientY, true));
    lastPointerSpawn = now;
  }
  // Optimized parallax on active slide with hardware acceleration
  const active = document.querySelector(".slide.active");
  if (active) {
    const xPct = (clientX / cw - 0.5) * 2; // normalize to -1 to 1
    const yPct = (clientY / ch - 0.5) * 2;

    // Use smaller values on mobile for subtler effect
    const xMultiplier = isMobile ? 4 : 8;
    const yMultiplier = isMobile ? 3 : 6;
    const xOffset = isMobile ? 6 : 14;
    const yOffset = isMobile ? 5 : 12;

    // Use translate3d for hardware acceleration
    active.style.transform = `translate3d(${xPct * xOffset}px, ${
      yPct * yOffset
    }px, 0) rotateY(${xPct * xMultiplier}deg) rotateX(${
      yPct * -yMultiplier
    }deg)`;
  }
  // sparkles trail
  sparkles.push(makeSparkle(clientX, clientY));
};

document.addEventListener(
  "pointermove",
  (e) => pointerHandler(e.clientX, e.clientY),
  { passive: true }
);
document.addEventListener(
  "pointerdown",
  (e) => {
    pointerHandler(e.clientX, e.clientY);
    spawnConfetti(e.clientX, e.clientY, 10);
    const now = performance.now();
    lastClickTime = now;
    const isButton = e.target.closest("button");
    const isReveal = e.target.closest(".reveal-btn");
    const isNav = e.target.closest(".nav-btn");
    // Play boop on presses, excluding the big reveal button and nav buttons (which have their own sounds)
    if (!isReveal && !isNav) {
      playBoopSometimes();
    }
    if (!isButton) playPop(1.05);
    // Ensure audio context is active after first interaction
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  },
  { passive: true }
);

// Double-click for massive heart burst
document.addEventListener(
  "dblclick",
  (e) => {
    // BIG HEART BURST on double click - varied sizes, exploding outward!
    for (let i = 0; i < 50; i++) {
      // Most hearts are small, some are massive, few are HUGE
      let size;
      let speedMultiplier;
      const random = Math.random();
      if (random < 0.7) {
        // 70% small hearts - fastest
        size = rand(8, 18);
        speedMultiplier = rand(1.5, 2.2);
      } else if (random < 0.85) {
        // 15% medium hearts - medium speed
        size = rand(20, 35);
        speedMultiplier = rand(0.9, 1.3);
      } else if (random < 0.95) {
        // 10% large hearts - slower
        size = rand(40, 70);
        speedMultiplier = rand(0.4, 0.7);
      } else {
        // 5% HUGE hearts - super slow
        size = rand(75, 120);
        speedMultiplier = rand(0.15, 0.35);
      }

      // Calculate position offset for explosion
      const angle = rand(0, Math.PI * 2);
      const distance = rand(50, 250);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;

      // Create heart with velocity pointing outward, scaled by size
      const heart = makeHeart(e.clientX, e.clientY, size);
      // Override velocity to explode outward - smaller = faster, bigger = slower
      const baseSpeed = rand(3, 8);
      heart.vx = (offsetX / distance) * baseSpeed * speedMultiplier;
      heart.vy = (offsetY / distance) * baseSpeed * speedMultiplier;
      // Varied colors: red, pink, purple (hue 300-360)
      heart.hue = rand(300, 360);
      hearts.push(heart);
    }
    spawnConfetti(e.clientX, e.clientY, 20);
    vibrate([20, 100, 20]);
    playHeartSFX(); // Play heart sound for double-click burst
  },
  { passive: true }
);

// Palette cycle: change scheme on ANY button click
const docEl = document.documentElement;
const palettes = [
  {
    name: "Original",
    bg1: "#0f1226",
    bg2: "#23123a",
    accent: "#ffd166",
    accent2: "#ff80bf",
    accent3: "#7bdff2",
  },
  {
    name: "Pastel",
    bg1: "#1a2038",
    bg2: "#2a1f4f",
    accent: "#ffd1dc",
    accent2: "#c5e1ff",
    accent3: "#baffc9",
  },
  {
    name: "Neon",
    bg1: "#000511",
    bg2: "#210045",
    accent: "#39ff14",
    accent2: "#ff00e5",
    accent3: "#00eaff",
  },
  {
    name: "Lava",
    bg1: "#120004",
    bg2: "#3a000b",
    accent: "#ff3d00",
    accent2: "#ffcc00",
    accent3: "#ff006e",
  },
  {
    name: "Ocean",
    bg1: "#022b3a",
    bg2: "#1f7a8c",
    accent: "#bfdbf7",
    accent2: "#00a6fb",
    accent3: "#0582ca",
  },
  {
    name: "Forest",
    bg1: "#0b2e13",
    bg2: "#1f5f2f",
    accent: "#a7f3d0",
    accent2: "#34d399",
    accent3: "#10b981",
  },
  {
    name: "Candy",
    bg1: "#2a0a2f",
    bg2: "#5b105f",
    accent: "#ff7bd0",
    accent2: "#ffd166",
    accent3: "#7bdff2",
  },
  {
    name: "Royal",
    bg1: "#0c1234",
    bg2: "#2a2f8f",
    accent: "#ffcf56",
    accent2: "#f72585",
    accent3: "#4cc9f0",
  },
  {
    name: "Mono HC",
    bg1: "#000000",
    bg2: "#1a1a1a",
    accent: "#ffffff",
    accent2: "#cccccc",
    accent3: "#888888",
  },
  {
    name: "Aurora",
    bg1: "#061222",
    bg2: "#14324e",
    accent: "#a0f0ff",
    accent2: "#b0ff9a",
    accent3: "#fda4af",
  },
  {
    name: "Sunset",
    bg1: "#1b1523",
    bg2: "#3a1c71",
    accent: "#ff9f1c",
    accent2: "#ff6f61",
    accent3: "#ff4154",
  },
  {
    name: "Mint",
    bg1: "#0e1f1a",
    bg2: "#1b3a2c",
    accent: "#a7ff83",
    accent2: "#17c3b2",
    accent3: "#7bdff2",
  },
  {
    name: "Midnight",
    bg1: "#0a0f1e",
    bg2: "#152238",
    accent: "#9ec1ff",
    accent2: "#6a7bff",
    accent3: "#00c2ff",
  },
  {
    name: "Desert",
    bg1: "#2c1d0b",
    bg2: "#5a3a1e",
    accent: "#ffd166",
    accent2: "#f4a261",
    accent3: "#e76f51",
  },
  {
    name: "Blossom",
    bg1: "#2b102a",
    bg2: "#4a174a",
    accent: "#ffb3c1",
    accent2: "#ff80bf",
    accent3: "#cdb4db",
  },
  {
    name: "Ice",
    bg1: "#0b1d2e",
    bg2: "#16324f",
    accent: "#d6f5ff",
    accent2: "#80eaff",
    accent3: "#b3f0ff",
  },
];
let paletteIndex = 0;
function applyPalette(p) {
  docEl.style.setProperty("--bg1", p.bg1);
  docEl.style.setProperty("--bg2", p.bg2);
  docEl.style.setProperty("--accent", p.accent);
  docEl.style.setProperty("--accent-2", p.accent2);
  docEl.style.setProperty("--accent-3", p.accent3);
  updateBubbleSplitPalette();
}
applyPalette(palettes[paletteIndex]);
function cyclePalette() {
  paletteIndex = (paletteIndex + 1) % palettes.length;
  applyPalette(palettes[paletteIndex]);
  spawnConfetti(cw / 2, ch * 0.2, 30);
  playPop(1.25);
}
// Global listener: ANY click cycles the palette
document.addEventListener(
  "click",
  () => {
    cyclePalette();
  },
  true
);

// Web Audio – satisfying UI and loading sounds
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// Global volume multiplier for synthesized (Web Audio) cues
// Leave boop (HTMLAudio) unchanged as requested
const SYNTH_VOLUME_MULT = 1.6; // ~+4 dB perceived

function ensureAudio() {
  if (!audioCtx && AudioCtx) {
    audioCtx = new AudioCtx();
  }
}

function now() {
  return audioCtx ? audioCtx.currentTime : 0;
}

function makeGain(value = 0) {
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(value, now());
  return g;
}

function quickEnv(g, dur = 0.15, peak = 0.08) {
  const t = now();
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0, t);
  const boostedPeak = peak * SYNTH_VOLUME_MULT;
  g.gain.linearRampToValueAtTime(boostedPeak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.001), t + dur);
}

function playBeep(freq = 440, type = "sine", dur = 0.12, gain = 0.08) {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now());
  const g = makeGain(0);
  quickEnv(g, dur, gain);
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + dur + 0.02);
}

function playPop(pitch = 1) {
  // Soft pop: short triangle ping with slight pitch sweep
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  osc.type = "triangle";
  const t0 = now();
  osc.frequency.setValueAtTime(180 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(110 * pitch, t0 + 0.12);
  const g = makeGain(0);
  quickEnv(g, 0.14, 0.06);
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  osc.stop(t0 + 0.16);
}

function playClickHigh() {
  playBeep(900, "square", 0.07, 0.05);
}

function playClickLow() {
  playBeep(300, "square", 0.08, 0.06);
}

function playBell() {
  // Simple chime: stacked partials with gentle decay
  ensureAudio();
  if (!audioCtx) return;
  const freqs = [660, 990, 1320];
  const tEnd = now() + 0.8;
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now());
    const g = makeGain(0);
    const peak = 0.06 / (i + 1);
    quickEnv(g, 0.7, peak);
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    osc.stop(tEnd);
  });
}

function playSpark() {
  // Bright ping
  playBeep(1600, "sine", 0.09, 0.05);
}

function playHeart() {
  // Warm thump
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  const t0 = now();
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.12);
  const g = makeGain(0);
  quickEnv(g, 0.16, 0.08);
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  osc.stop(t0 + 0.2);
}

// Suspense (loading) tone: rises with progress
let suspense = null;
function playSuspense() {
  ensureAudio();
  if (!audioCtx || suspense) return;
  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  const g = makeGain(0);
  // Soft start
  g.gain.setValueAtTime(0.0001, now());
  g.gain.exponentialRampToValueAtTime(0.02 * SYNTH_VOLUME_MULT, now() + 0.1);
  osc.frequency.setValueAtTime(220, now());
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  suspense = { osc, gain: g };
}

function updateSuspense(p) {
  if (!suspense || !audioCtx) return;
  const t = now();
  const targetFreq = 220 + p * 900; // 220Hz -> ~1120Hz
  suspense.osc.frequency.cancelScheduledValues(t);
  suspense.osc.frequency.linearRampToValueAtTime(targetFreq, t + 0.05);
  // Slightly increase loudness as we progress
  const targetGain = (0.02 + p * 0.03) * SYNTH_VOLUME_MULT;
  suspense.gain.gain.cancelScheduledValues(t);
  suspense.gain.gain.linearRampToValueAtTime(targetGain, t + 0.05);
}

function stopSuspense() {
  if (!suspense || !audioCtx) return;
  const t = now();
  suspense.gain.gain.cancelScheduledValues(t);
  suspense.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  suspense.osc.stop(t + 0.14);
  suspense = null;
}

function playSuccess() {
  // Pleasant success triad
  ensureAudio();
  if (!audioCtx) return;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now());
    const g = makeGain(0);
    const dur = 0.35 + i * 0.1;
    quickEnv(g, dur, 0.06 / (i + 1));
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    osc.stop(now() + dur + 0.02);
  });
}

function playWhoosh(direction) {
  // Short filtered-noise sweep for slide transitions
  ensureAudio();
  if (!audioCtx) return;
  const bufferSize = 0.2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  const startFreq = direction === "right" ? 400 : 1200;
  const endFreq = direction === "right" ? 1600 : 300;
  filter.frequency.setValueAtTime(startFreq, now());
  filter.frequency.linearRampToValueAtTime(endFreq, now() + 0.18);
  const g = makeGain(0);
  quickEnv(g, 0.18, 0.06);
  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start();
  src.stop(now() + 0.22);
}

function playBack() {
  // Short, low whoosh indicating back navigation
  ensureAudio();
  if (!audioCtx) return;
  const bufferSize = Math.floor(0.15 * audioCtx.sampleRate);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now());
  filter.frequency.linearRampToValueAtTime(280, now() + 0.12);
  const g = makeGain(0);
  quickEnv(g, 0.14, 0.07);
  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start();
  src.stop(now() + 0.18);
}

// Button boop sound using HTMLAudioElement
const boopSrc = "audio/boop.mp3";
let boopPool = [];
let boopIndex = 0;
function initBoop() {
  if (boopPool.length) return;
  for (let i = 0; i < 5; i++) {
    const a = new Audio(boopSrc);
    a.preload = "auto";
    a.volume = 0.9;
    boopPool.push(a);
  }
}
function playBoop() {
  try {
    if (!boopPool.length) initBoop();
    const a = boopPool[boopIndex++ % boopPool.length];
    a.currentTime = 0;
    a.muted = false;
    // iOS sometimes blocks HTMLAudio when the ringer is off; try, then fallback
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.catch(() => {
        try {
          // Fallback: WebAudio pop for mobile/iOS
          ensureAudio();
          if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
          }
          playPop(1.1);
        } catch (_) {}
      });
    }
  } catch (_) {}
}

// Limit how often the boop plays (to reduce "every click" fatigue).
// Set to 2 for every other click, 3 for once every 3 clicks, etc.
const BOOP_EVERY_NTH_CLICK = 5;
let boopClickCount = 0;
function playBoopSometimes() {
  boopClickCount++;
  if (boopClickCount % BOOP_EVERY_NTH_CLICK !== 0) return;
  playBoop();
}

// Additional SFX pools for boom/back/heart
function createSfxPool(src, size = 4, volume = 1) {
  const pool = [];
  for (let i = 0; i < size; i++) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = volume;
    pool.push(a);
  }
  let idx = 0;
  return {
    play() {
      try {
        const a = pool[idx++ % pool.length];
        a.currentTime = 0;
        a.play().catch(() => {});
      } catch (_) {}
    },
  };
}

let sfxBoom = null;
let sfxBack = null;
let sfxHeart = null;
let sfxNext = null;
function playBoomSFX() {
  if (!sfxBoom) sfxBoom = createSfxPool("audio/boom.mp3", 3, 1);
  sfxBoom.play();
}
function playBackSFX() {
  if (!sfxBack) sfxBack = createSfxPool("audio/back.mp3", 3, 1);
  sfxBack.play();
}
function playHeartSFX() {
  if (!sfxHeart) sfxHeart = createSfxPool("audio/heart.mp3", 3, 1);
  sfxHeart.play();
}
function playNextSFX() {
  if (!sfxNext) sfxNext = createSfxPool("audio/next.mp3", 3, 1);
  sfxNext.play();
}

function playSiren(cycles = 2) {
  // Police-style siren: pitch wail with slight vibrato
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const t0 = now();
  const upDur = 0.9;
  const downDur = 0.9;
  const cycleDur = upDur + downDur;
  const total = cycles * cycleDur + 0.1;

  // Master chain
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-10, t0);
  comp.knee.setValueAtTime(20, t0);
  comp.ratio.setValueAtTime(2.5, t0);
  comp.attack.setValueAtTime(0.003, t0);
  comp.release.setValueAtTime(0.35, t0);
  const master = makeGain(0);
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.35, t0 + 0.08);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
  comp.connect(master).connect(audioCtx.destination);

  // Tone voices
  const v1 = audioCtx.createOscillator();
  const v2 = audioCtx.createOscillator();
  v1.type = "sawtooth";
  v2.type = "square";
  const baseStart = 650; // Hz
  const baseEnd = 1100; // Hz
  v1.frequency.setValueAtTime(baseStart, t0);
  v2.frequency.setValueAtTime(baseStart * 1.03, t0);

  // Vibrato LFO
  const lfo = audioCtx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(6, t0); // 6 Hz vibrato
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(12, t0); // ±12 Hz
  lfo.connect(lfoGain);
  lfoGain.connect(v1.frequency);
  lfoGain.connect(v2.frequency);

  // Timbre filter
  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1200, t0);
  bp.Q.setValueAtTime(0.6, t0);

  const g1 = makeGain(0.18);
  const g2 = makeGain(0.12);
  v1.connect(g1).connect(bp).connect(comp);
  v2.connect(g2).connect(bp).connect(comp);

  // Schedule wail cycles
  for (let c = 0; c < cycles; c++) {
    const cs = t0 + c * cycleDur;
    // up
    v1.frequency.linearRampToValueAtTime(baseEnd, cs + upDur);
    v2.frequency.linearRampToValueAtTime(baseEnd * 1.03, cs + upDur);
    // down
    v1.frequency.linearRampToValueAtTime(baseStart, cs + cycleDur);
    v2.frequency.linearRampToValueAtTime(baseStart * 1.03, cs + cycleDur);
  }

  v1.start(t0);
  v2.start(t0);
  lfo.start(t0);
  v1.stop(t0 + total);
  v2.stop(t0 + total);
  lfo.stop(t0 + total);
}

function playParty() {
  // Party vibe: horn wail + chord stabs + claps + sparkles
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const t0 = now();
  const total = 1.6;

  // Master chain
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-12, t0);
  comp.knee.setValueAtTime(20, t0);
  comp.ratio.setValueAtTime(2.0, t0);
  comp.attack.setValueAtTime(0.003, t0);
  comp.release.setValueAtTime(0.4, t0);
  const master = makeGain(0);
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.5, t0 + 0.08);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
  comp.connect(master).connect(audioCtx.destination);

  // Party horn (wail)
  const horn = audioCtx.createOscillator();
  horn.type = "sawtooth";
  horn.frequency.setValueAtTime(330, t0);
  horn.frequency.linearRampToValueAtTime(880, t0 + 0.5);
  horn.frequency.linearRampToValueAtTime(600, t0 + 0.85);
  const hornGain = makeGain(0);
  quickEnv(hornGain, 0.9, 0.35);
  // Gentle bandpass to shape timbre
  const hornBP = audioCtx.createBiquadFilter();
  hornBP.type = "bandpass";
  hornBP.frequency.setValueAtTime(1200, t0);
  hornBP.Q.setValueAtTime(0.7, t0);
  horn.connect(hornGain).connect(hornBP).connect(comp);
  horn.start(t0);
  horn.stop(t0 + 1.0);

  // Chord stabs (C major: C5 E5 G5)
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t0 + 0.18);
    const g = makeGain(0);
    quickEnv(g, 0.22 + i * 0.06, 0.12 / (i + 1));
    o.connect(g).connect(comp);
    o.start(t0 + 0.18);
    o.stop(t0 + 0.5 + i * 0.05);
  });

  // Handclaps: bandpass-filtered noise bursts
  function clap(at) {
    const len = 0.25 * audioCtx.sampleRate;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, at);
    bp.Q.setValueAtTime(0.8, at);
    const g = makeGain(0);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    src.connect(bp).connect(g).connect(comp);
    src.start(at);
    src.stop(at + 0.22);
  }
  clap(t0 + 0.32);
  clap(t0 + 0.62);

  // Sparkle pings
  [1400, 1650, 1900].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t0 + 0.4 + i * 0.06);
    const g = makeGain(0);
    quickEnv(g, 0.12, 0.08);
    o.connect(g).connect(comp);
    o.start(t0 + 0.4 + i * 0.06);
    o.stop(t0 + 0.55 + i * 0.06);
  });
}

function playBoom() {
  // Big boom: sub thump + noise burst with downward sweep
  ensureAudio();
  if (!audioCtx) return;

  // Ensure context is running (iOS/safari quirks)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const t0 = now();

  // Master chain: stronger compressor + bass boost + master envelope
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-16, t0);
  comp.knee.setValueAtTime(22, t0);
  comp.ratio.setValueAtTime(3.5, t0);
  comp.attack.setValueAtTime(0.002, t0);
  comp.release.setValueAtTime(0.5, t0);
  const bass = audioCtx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.setValueAtTime(120, t0);
  bass.gain.setValueAtTime(12, t0);
  const master = makeGain(0);
  // Fast rise to loud peak, long decay
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
  comp.connect(bass).connect(master).connect(audioCtx.destination);

  // Sub layer 1 (sine)
  const sub = audioCtx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(70, t0);
  sub.frequency.exponentialRampToValueAtTime(35, t0 + 0.6);
  const subGain = makeGain(0);
  quickEnv(subGain, 0.8, 0.75);
  sub.connect(subGain).connect(comp);
  sub.start();
  sub.stop(t0 + 0.9);

  // Sub layer 2 (square, detuned for fatness)
  const sub2 = audioCtx.createOscillator();
  sub2.type = "square";
  sub2.frequency.setValueAtTime(85, t0);
  sub2.frequency.exponentialRampToValueAtTime(42, t0 + 0.55);
  const sub2Gain = makeGain(0);
  quickEnv(sub2Gain, 0.7, 0.35);
  sub2.connect(sub2Gain).connect(comp);
  sub2.start();
  sub2.stop(t0 + 0.8);

  // Saturation waveshaper for thickness
  function makeSaturator(amount = 2.0) {
    const ws = audioCtx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = i / 512 - 1;
      curve[i] = Math.tanh(amount * x);
    }
    ws.curve = curve;
    ws.oversample = "4x";
    return ws;
  }

  // Noise burst (longer tail, saturated)
  const len = 1.2 * audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const channel = buf.getChannelData(0);
  for (let i = 0; i < len; i++) channel[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t0);
  lp.frequency.exponentialRampToValueAtTime(140, t0 + 1.0);
  const saturator = makeSaturator(3.0);
  const nGain = makeGain(0);
  nGain.gain.setValueAtTime(0.0001, t0);
  nGain.gain.exponentialRampToValueAtTime(0.6, t0 + 0.08);
  nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
  noise.connect(lp).connect(saturator).connect(nGain).connect(comp);
  noise.start(t0);
  noise.stop(t0 + 1.2);

  // Transient crack
  const crackOsc = audioCtx.createOscillator();
  crackOsc.type = "square";
  crackOsc.frequency.setValueAtTime(2200, t0);
  const crackGain = makeGain(0);
  quickEnv(crackGain, 0.05, 0.18);
  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1500, t0);
  crackOsc.connect(hp).connect(crackGain).connect(comp);
  crackOsc.start(t0);
  crackOsc.stop(t0 + 0.07);

  // Stereo delay send for space
  const send = makeGain(0.25);
  const dL = audioCtx.createDelay(0.5);
  const dR = audioCtx.createDelay(0.5);
  dL.delayTime.setValueAtTime(0.12, t0);
  dR.delayTime.setValueAtTime(0.17, t0);
  const pL = audioCtx.createStereoPanner();
  const pR = audioCtx.createStereoPanner();
  pL.pan.setValueAtTime(-0.7, t0);
  pR.pan.setValueAtTime(0.7, t0);
  comp.connect(send);
  send.connect(dL).connect(pL).connect(audioCtx.destination);
  send.connect(dR).connect(pR).connect(audioCtx.destination);
}

// Turbo mode removed per request

// Button ripple util
function addRipple(e) {
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rip = document.createElement("span");
  rip.className = "ripple";
  rip.style.left = x + "px";
  rip.style.top = y + "px";
  target.appendChild(rip);
  rip.addEventListener("animationend", () => rip.remove());
}

function triggerDarken() {
  const darken = document.querySelector(".click-darken");
  darken.classList.add("active");
  setTimeout(() => {
    darken.classList.remove("active");
  }, 300);
}

function triggerColorBurst() {
  // Create color burst overlay
  const burst = document.createElement("div");
  burst.className = "color-burst";
  document.body.appendChild(burst);

  // Trigger animation
  requestAnimationFrame(() => {
    burst.classList.add("active");
  });

  // Remove after animation
  setTimeout(() => {
    burst.remove();
  }, 1000);

  // Fireworks burst removed
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "t" || e.key === "T") {
    turboMode = !turboMode;
    resizeCanvas(); // adjust particle counts
  }
  // 'f' shortcut fireworks removed
  if (e.key === "h" || e.key === "H") {
    for (let i = 0; i < 10; i++) {
      hearts.push(makeHeart(rand(0, cw), rand(0, ch)));
    }
  }
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", updateActiveSlideLongness);
resizeCanvas();

// Device orientation for 3D tilt on mobile - optimized with smoothing
// Calibrated: treats the *current* phone pose as "straight" and only tilts on change.
if (
  typeof isMobile !== "undefined" &&
  isMobile &&
  window.DeviceOrientationEvent
) {
  let currentRotateX = 0;
  let currentRotateY = 0;
  let targetRotateX = 0;
  let targetRotateY = 0;
  let orientationRAF = null;

  let baselineSet = false;
  let baselineBeta = 0;
  let baselineGamma = 0;

  let orientationListenerAttached = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Smoothing function for natural movement
  function smoothOrientation() {
    // Interpolate current values toward target (smoothing)
    const smoothing = 0.2;
    currentRotateX += (targetRotateX - currentRotateX) * smoothing;
    currentRotateY += (targetRotateY - currentRotateY) * smoothing;

    // Apply transform to active slide instead of body for better performance
    const active = document.querySelector(".slide.active");
    if (active) {
      active.style.transform = `translate3d(0, 0, 0) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;
    }

    orientationRAF = requestAnimationFrame(smoothOrientation);
  }

  function handleDeviceOrientation(event) {
    const beta = event.beta; // front-to-back tilt (-180 to 180)
    const gamma = event.gamma; // left-to-right tilt (-90 to 90)

    if (beta !== null && gamma !== null) {
      // First valid reading becomes the neutral "straight" baseline.
      if (!baselineSet) {
        baselineBeta = beta;
        baselineGamma = gamma;
        baselineSet = true;
        // Ensure no sudden jump on calibration
        currentRotateX = 0;
        currentRotateY = 0;
        targetRotateX = 0;
        targetRotateY = 0;
      }

      const deltaBeta = beta - baselineBeta;
      const deltaGamma = gamma - baselineGamma;

      // Dampen the effect for mobile - less intense than original
      // Clamp values to prevent extreme rotations
      const clampedBeta = clamp(deltaBeta, -60, 60);
      const clampedGamma = clamp(deltaGamma, -45, 45);

      targetRotateX = clampedBeta * 0.15;
      targetRotateY = clampedGamma * 0.2;

      // Start animation loop if not already running
      if (!orientationRAF) {
        smoothOrientation();
      }
    }
  }

  async function attachDeviceOrientationListener() {
    if (orientationListenerAttached) return;
    orientationListenerAttached = true;

    // iOS 13+ requires a user gesture to grant permission.
    try {
      const maybeRequest = window.DeviceOrientationEvent.requestPermission;
      if (typeof maybeRequest === "function") {
        const result = await maybeRequest.call(window.DeviceOrientationEvent);
        if (result !== "granted") return;
      }
    } catch (_) {
      // If permission fails, just don't attach.
      return;
    }

    window.addEventListener("deviceorientation", handleDeviceOrientation, {
      passive: true,
    });
  }

  // Try to attach immediately (non-iOS), otherwise attach on first user gesture.
  attachDeviceOrientationListener();
  document.addEventListener("pointerdown", attachDeviceOrientationListener, {
    once: true,
    passive: true,
  });

  // If the user rotates the screen (portrait/landscape), re-calibrate.
  window.addEventListener("orientationchange", () => {
    baselineSet = false;
  });

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (orientationRAF) {
      cancelAnimationFrame(orientationRAF);
    }

    try {
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    } catch (_) {}
  });
}

animate();
