import { prefersReducedMotion } from "./env";

/** Brand confetti colours (the one place hard-coded colours are allowed for motion). */
const COLORS = ["#5B3FD0", "#AB9FF2", "#2FBF8A", "#F5A524"];

interface Piece { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string }

/**
 * Small, brief confetti burst from a point (viewport coords). ~40 pieces, ~0.9s,
 * on a temporary full-screen canvas that ignores pointer events and removes itself.
 * Does nothing when the user prefers reduced motion.
 */
export function burstConfetti(x: number, y: number, count = 40) {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "60" });
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9; // mostly upwards
    const speed = 4 + Math.random() * 5;
    return {
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 5 + Math.random() * 4, h: 3 + Math.random() * 3,
      c: COLORS[i % COLORS.length],
    };
  });

  const DURATION = 900;
  const t0 = performance.now();
  let last = t0;
  const frame = (now: number) => {
    const elapsed = now - t0;
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION * 0.55) / (DURATION * 0.45));
    for (const p of pieces) {
      p.vy += 0.22 * dt; // gravity
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Burst from the centre of an element. */
export function burstConfettiFrom(el: Element | null | undefined) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
}
