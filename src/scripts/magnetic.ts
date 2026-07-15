/**
 * Magnetic primary-CTA interaction (LPV2-04) — a subtle pull of the primary CTA
 * toward a nearby pointer, easing back home as the pointer leaves its radius.
 *
 * It REUSES the Motion spring from the LPV2-03 signature island (`springValue` +
 * `styleEffect`) — the same bundled, same-origin `motion` lib, no new dependency
 * (the `motion`-only import allowlist in test/motion-a11y.test.mjs still holds).
 *
 * ⚠️ Motion does NOT honour reduced motion, so — exactly like hero-signature.ts —
 * this island MUST gate itself: it early-returns to a fully static state on
 * `isEffectiveMotionOff()` (OS reduce OR the in-page toggle, LPV2-02) BEFORE any
 * Motion call, and runs on `pointer:fine` ONLY (no magnetism on touch — the 44px
 * tap target must never drift under a finger). Touch + no-JS get a plain,
 * un-transformed CTA; the pull is a desktop nicety.
 *
 * Bounds that keep it honest (mirrors hero-signature.ts):
 *   - the CTA opts in via `[data-magnetic]` on a wrapper that is NOT the Reveal
 *     stagger child — the entrance transform (CSS transition on the stagger child)
 *     and this pull transform (WAAPI spring on the inner wrapper) live on DIFFERENT
 *     elements, so they never fight over one element's `transform`.
 *   - rAF-throttled: at most one pointer READ per frame; Motion's `styleEffect`
 *     does at most one transform WRITE per frame.
 *   - armed AFTER first paint (on `astro:page-load`), re-armed after every swap.
 *   - STRONG teardown on `astro:before-swap`: a DOCUMENT-level `pointermove` added
 *     per swap WITHOUT removal is an ACCUMULATING leak — so we removeEventListener
 *     each listener, `.stop()` the springs, and cancel the style bindings.
 */
import { springValue, styleEffect, type MotionValue } from "motion";
import { isEffectiveMotionOff } from "./motion-pref";

export {}; // ES-module scope (bundled by Astro as a module <script>).

const FINE_POINTER = "(pointer: fine)";
/** Fraction of the pointer→CTA offset the CTA follows (kept subtle). */
const PULL_STRENGTH = 0.28;
/** Hard cap on the pull travel — never enough to shove the 44px target off itself. */
const MAX_PULL_PX = 10;
/** The CTA reacts only while the pointer is within this radius of its centre. */
const ACTIVATE_RADIUS_PX = 130;

interface Magnet {
  el: HTMLElement;
  x: MotionValue<number>;
  y: MotionValue<number>;
  cancelStyle: () => void; // styleEffect cleanup
}

let magnets: Magnet[] = [];
let onMove: ((event: PointerEvent) => void) | null = null;
let onLeave: (() => void) | null = null;
let onScroll: (() => void) | null = null;
let frameId = 0;
let pending: { cx: number; cy: number } | null = null;

const clampAbs = (v: number, max: number): number =>
  Math.max(-max, Math.min(max, v));

/** Ease every magnet back to identity. */
function releaseAll(): void {
  for (const m of magnets) {
    m.x.set(0);
    m.y.set(0);
  }
}

/** rAF callback (one per frame): pull each magnet toward the latest pointer if it
 *  is within radius, else ease it home. Motion writes the transform via styleEffect. */
function flush(): void {
  frameId = 0;
  if (!pending) return;
  // Live a11y gate: if the OS setting or the in-page toggle turned motion OFF
  // mid-session, ease every magnet home and stop tracking. The init-time gate
  // below only re-runs per navigation (astro:page-load); this reacts within the
  // current page (a click on the toggle button is itself a pointer interaction,
  // so a frame lands and releases the pull).
  if (isEffectiveMotionOff()) {
    releaseAll();
    return;
  }
  const { cx, cy } = pending;
  for (const m of magnets) {
    const rect = m.el.getBoundingClientRect();
    const dx = cx - (rect.left + rect.width / 2);
    const dy = cy - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < ACTIVATE_RADIUS_PX) {
      m.x.set(clampAbs(dx * PULL_STRENGTH, MAX_PULL_PX));
      m.y.set(clampAbs(dy * PULL_STRENGTH, MAX_PULL_PX));
    } else {
      m.x.set(0);
      m.y.set(0);
    }
  }
}

/** Document pointer move → remember the position; rAF-throttle so at most one read
 *  (and one spring update) lands per frame. */
function handleMove(event: PointerEvent): void {
  pending = { cx: event.clientX, cy: event.clientY };
  if (!frameId) frameId = requestAnimationFrame(flush);
}

/** Pointer left the document (edge exit) → ease every magnet home. */
function handleLeave(): void {
  pending = null;
  releaseAll();
}

/** Scroll re-runs flush against the LAST pointer position: scrolling moves the CTA
 *  under a stationary cursor WITHOUT firing a pointermove, so without this the CTA
 *  would freeze at a stale offset. Recomputing against the live rect keeps it
 *  tracking (and eases it home once the CTA scrolls out of radius). Passive +
 *  rAF-throttled, so it never blocks or over-runs the scroll. */
function handleScroll(): void {
  if (pending && !frameId) frameId = requestAnimationFrame(flush);
}

function teardown(): void {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
  if (onMove) document.removeEventListener("pointermove", onMove);
  if (onLeave) document.removeEventListener("pointerleave", onLeave);
  if (onScroll) window.removeEventListener("scroll", onScroll);
  for (const m of magnets) {
    m.x.stop(); // halt any in-flight spring before dropping the DOM subscriber
    m.y.stop();
    m.cancelStyle(); // unhook styleEffect's per-frame transform write
  }
  magnets = [];
  pending = null;
  onMove = null;
  onLeave = null;
  onScroll = null;
}

function init(): void {
  teardown(); // idempotent: clear any prior wiring before re-arming after a swap.

  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-magnetic]"),
  );
  if (els.length === 0) return;

  // A11y gate FIRST — before any Motion call. Motion has no reduce-motion of its
  // own, so this early-return is the ONLY thing keeping the CTA static under OS
  // reduce OR the in-page toggle.
  if (isEffectiveMotionOff()) return;

  // pointer:fine ONLY — no magnetism on touch (the tap target must not drift).
  if (!window.matchMedia(FINE_POINTER).matches) return;

  magnets = els.map((el) => {
    const x = springValue<number>(0);
    const y = springValue<number>(0);
    const cancelStyle = styleEffect(el, { x, y });
    return { el, x, y, cancelStyle };
  });

  onMove = handleMove;
  onLeave = handleLeave;
  onScroll = handleScroll;
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", onScroll, { passive: true });
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", teardown);
