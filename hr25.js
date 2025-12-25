const slides = document.querySelectorAll(".slide");
let index = 0;
let prevIndex = 0;

function showSlide(i) {
  const direction = i > prevIndex ? "right" : "left";
  const leaving = slides[prevIndex];
  if (leaving) {
    leaving.classList.add(
      "leaving",
      direction === "right" ? "exit-left" : "exit-right"
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
    s.classList.remove("active", "enter-left", "enter-right")
  );
  slides[i].classList.add(
    "active",
    direction === "right" ? "enter-right" : "enter-left"
  );
  // Hide content and show reveal button for the active slide
  const activeSlide = slides[i];
  const content = activeSlide.querySelector(".content");
  const revealBtn = activeSlide.querySelector(".reveal-btn");
  if (content) content.classList.add("hidden");
  if (revealBtn) revealBtn.style.display = "block";
  prevIndex = i;
}

function nextSlide() {
  if (index < slides.length - 1) {
    index++;
    showSlide(index);
  }
}

function prevSlide() {
  if (index > 0) {
    index--;
    showSlide(index);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") {
    nextSlide();
  }
  if (e.key === "ArrowLeft") {
    prevSlide();
  }
});

// Add button event listeners
document.querySelectorAll(".prev-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    addRipple(e);
    playClickLow();
    // vibrate(8);
    prevSlide();
    // Add bubbly click effects
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Spawn bubbles around the button
    for (let i = 0; i < 4; i++) {
      bubbles.push(
        makeBubble(centerX + rand(-30, 30), centerY + rand(-30, 30), true)
      );
    }
    // Small confetti burst
    spawnConfetti(centerX, centerY, 8);
    // Darken background
    triggerDarken();
  });
});
document.querySelectorAll(".next-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    addRipple(e);
    playClickHigh();
    // vibrate(8);
    nextSlide();
    // Add bubbly click effects
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Spawn bubbles around the button
    for (let i = 0; i < 12; i++) {
      bubbles.push(
        makeBubble(centerX + rand(-30, 30), centerY + rand(-30, 30), true)
      );
    }
    // Small confetti burst
    spawnConfetti(centerX, centerY, 3);
    // Darken background
    triggerDarken();
  });
});

// Press-and-hold reveal buttons (3s) with progress ring and reveal effects
let revealCounter = 0;
function vibrate(pattern) {
  try {
    if (navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}
function triggerRevealForButton(btn, variant) {
  const slide = btn.closest(".slide");
  const content = slide.querySelector(".content");
  if (content) {
    content.classList.remove("hidden");
    // next frame to allow transition
    requestAnimationFrame(() => content.classList.add("show"));
    const rect = btn.getBoundingClientRect();
    fireworks.push(
      makeFirework(rect.left + rect.width / 2, rect.top + rect.height / 2)
    );
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
    if (variant === "spark") playSpark();
    else if (variant === "bell") playBell();
    else playPop();
    vibrate([20, 50, 20]);
    btn.style.display = "none";
  }
}

document.querySelectorAll(".reveal-btn").forEach((btn) => {
  const variant = ["pop", "spark", "bell"][revealCounter++ % 3];
  let holding = false;
  let holdStart = 0;
  let holdRAF = null;
  let holdIndicator = null;
  let milestone = 0; // for haptic progress pulses
  const required = 3000; // 3 seconds

  const cleanupHold = () => {
    holding = false;
    if (holdIndicator) {
      holdIndicator.remove();
      holdIndicator = null;
    }
    if (holdRAF) {
      cancelAnimationFrame(holdRAF);
      holdRAF = null;
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
      cleanupHold();
      vibrate([50, 100, 50, 100, 50]);
      triggerRevealForButton(btn, variant);
      // MASSIVE EXPLOSION EFFECT
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // HUGE confetti burst - multiple waves
      spawnConfetti(centerX, centerY, 60);
      setTimeout(() => spawnConfetti(centerX, centerY, 30), 100);
      setTimeout(() => spawnConfetti(centerX, centerY, 20), 200);
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
      return;
    }
    holdRAF = requestAnimationFrame(loop);
  };

  btn.addEventListener("pointerdown", (e) => {
    addRipple(e);
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
      cleanupHold();
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
    for (let i = 0; i < 3; i++) {
      bubbles.push(makeBubble(x + rand(-15, 15), y + rand(-15, 15), true));
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
let fireworks = [];
let lastClickTime = 0;
let snowTarget = 30;

function resizeCanvas() {
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // adjust bubble count based on area
  let base = Math.max(60, Math.floor((cw * ch) / 18000));
  if (turboMode) base *= 1.8;
  const target = Math.min(200, base);
  while (bubbles.length < target) bubbles.push(makeBubble());
  if (bubbles.length > target) bubbles.length = target;
  // stars
  let starTarget = Math.max(10, Math.floor((cw * ch) / 70000));
  while (stars.length < starTarget) stars.push(makeStar());
  if (stars.length > starTarget) stars.length = starTarget;
  // snowflakes
  snowTarget = Math.max(20, Math.floor((cw * ch) / 35000));
  while (snowflakes.length < snowTarget) snowflakes.push(makeSnowflake());
  if (snowflakes.length > snowTarget) snowflakes.length = snowTarget;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function makeBubble(x, y, burst = false) {
  const r = burst ? rand(10, 20) : rand(6, 18);
  return {
    x: x !== undefined ? x : rand(0, cw),
    y: y !== undefined ? y : rand(ch * 0.6, ch + 50),
    r,
    vy: burst ? -rand(1.0, 2.2) : -rand(0.25, 1.15),
    vx: burst ? rand(-1.0, 1.0) : rand(-0.4, 0.4),
    alpha: burst ? rand(0.7, 1) : rand(0.35, 0.85),
    hue: rand(180, 330),
  };
}

function drawBubble(b) {
  const grd = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
  grd.addColorStop(0, `hsla(${b.hue}, 80%, 70%, ${b.alpha})`);
  grd.addColorStop(1, `hsla(${b.hue}, 80%, 60%, ${b.alpha * 0.35})`);
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
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.01;
    h.alpha *= 0.995;
    drawHeart(h);
    if (h.alpha < 0.05) hearts.splice(i, 1);
  }
  // fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i];
    for (let p of f) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    drawFirework(f);
    if (f.every((p) => p.life <= 0)) fireworks.splice(i, 1);
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
    size: rand(1, 3),
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
    size: rand(2, 5),
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

function makeFirework(x, y) {
  const particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: rand(-3, 3),
      vy: rand(-3, 3),
      life: rand(30, 60),
      maxLife: rand(30, 60),
      hue: rand(0, 360),
    });
  }
  return particles;
}

function drawFirework(f) {
  for (let p of f) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// pointer/touch interactivity: track and spawn micro bubbles
const pointerHandler = (clientX, clientY) => {
  pointerX = clientX;
  pointerY = clientY;
  const now = performance.now();
  if (now - lastPointerSpawn > 40) {
    bubbles.push(makeBubble(clientX, clientY, true));
    lastPointerSpawn = now;
  }
  // Optimized parallax on active slide with hardware acceleration
  const active = document.querySelector(".slide.active");
  if (active) {
    const xPct = (clientX / cw - 0.5) * 2; // normalize to -1 to 1
    const yPct = (clientY / ch - 0.5) * 2;

    // Use smaller values on mobile for subtler effect
    const isMobile = window.innerWidth <= 600;
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
    if (now - lastClickTime < 300) {
      fireworks.push(makeFirework(e.clientX, e.clientY));
    }
    lastClickTime = now;
    const isButton = e.target.closest("button");
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
    playHeart(); // Play heart sound for double-click burst
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
];
let paletteIndex = 0;
function applyPalette(p) {
  docEl.style.setProperty("--bg1", p.bg1);
  docEl.style.setProperty("--bg2", p.bg2);
  docEl.style.setProperty("--accent", p.accent);
  docEl.style.setProperty("--accent-2", p.accent2);
  docEl.style.setProperty("--accent-3", p.accent3);
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

// Audio disabled
const AudioCtx = null;
const audioCtx = null;

function playPop(pitch = 1) {}
function playClickHigh() {}
function playClickLow() {}
function playBell() {}
function playSpark() {}
function playHeart() {}
function playSuspense() {}
function stopSuspense() {}
function playSuccess() {}

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

  // Add multiple fireworks
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      fireworks.push(
        makeFirework(rand(cw * 0.2, cw * 0.8), rand(ch * 0.2, ch * 0.6))
      );
    }, i * 80);
  }
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "t" || e.key === "T") {
    turboMode = !turboMode;
    resizeCanvas(); // adjust particle counts
    fireworks.push(makeFirework(cw / 2, ch / 2)); // fireworks on toggle
  }
  if (e.key === "f" || e.key === "F") {
    fireworks.push(makeFirework(cw / 2, ch / 2));
  }
  if (e.key === "h" || e.key === "H") {
    for (let i = 0; i < 10; i++) {
      hearts.push(makeHeart(rand(0, cw), rand(0, ch)));
    }
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Device orientation for 3D tilt on mobile - optimized with smoothing
if (window.DeviceOrientationEvent) {
  let currentRotateX = 0;
  let currentRotateY = 0;
  let targetRotateX = 0;
  let targetRotateY = 0;
  let orientationRAF = null;

  // Smoothing function for natural movement
  function smoothOrientation() {
    // Interpolate current values toward target (smoothing)
    const smoothing = 0.1;
    currentRotateX += (targetRotateX - currentRotateX) * smoothing;
    currentRotateY += (targetRotateY - currentRotateY) * smoothing;

    // Apply transform to active slide instead of body for better performance
    const active = document.querySelector(".slide.active");
    if (active) {
      active.style.transform = `translate3d(0, 0, 0) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;
    }

    orientationRAF = requestAnimationFrame(smoothOrientation);
  }

  window.addEventListener("deviceorientation", function (event) {
    const beta = event.beta; // front-to-back tilt (-180 to 180)
    const gamma = event.gamma; // left-to-right tilt (-90 to 90)

    if (beta !== null && gamma !== null) {
      // Dampen the effect for mobile - less intense than original
      // Clamp values to prevent extreme rotations
      const clampedBeta = Math.max(-60, Math.min(60, beta));
      const clampedGamma = Math.max(-45, Math.min(45, gamma));

      targetRotateX = clampedBeta * 0.15; // reduced from 0.5
      targetRotateY = clampedGamma * 0.2; // reduced from 0.5

      // Start animation loop if not already running
      if (!orientationRAF) {
        smoothOrientation();
      }
    }
  });

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (orientationRAF) {
      cancelAnimationFrame(orientationRAF);
    }
  });
}

animate();
