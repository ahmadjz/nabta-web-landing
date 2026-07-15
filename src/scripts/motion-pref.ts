/**
 * Motion-preference system (LPV2-02). Combines the OS `prefers-reduced-motion`
 * setting with an in-page toggle into ONE effective-motion signal, and persists
 * the user's choice across reloads + ClientRouter swaps.
 *
 * Two consumers, two mechanisms — because motion here is split:
 *   - CSS-driven motion (reveal / ambient drift / scroll) is neutralised by the
 *     CSS TWIN in global.css keyed on `html[data-motion="off"]`, mirroring the
 *     `@media (prefers-reduced-motion: reduce)` block. A JS data-attr alone is
 *     INERT on CSS motion, so THIS module only flips the attr; the CSS collapses
 *     the durations (`!important`, beating AmbientBackdrop's inline duration).
 *   - JS-driven motion (count-up.ts, and the later hero-signature / magnetic
 *     islands) calls `isEffectiveMotionOff()` and early-returns static.
 *
 * Persistence: the choice lives in `localStorage["nabta-motion"]` ("off"/"on").
 * An inline PRE-PAINT `<script is:inline>` in Base.astro stamps
 * `<html data-motion="off">` during head parse (before first paint), so a reload
 * can't flash motion. This module re-applies it on every `astro:page-load` (the
 * swapped-in <html> arrives WITHOUT the attr) and wires the toggle button.
 *
 * Same `astro:page-load` lifecycle as reveal.ts / count-up.ts. The click handler
 * is delegated once at the document level, so it survives ClientRouter swaps (the
 * button element is replaced per swap; a delegated listener is not) without
 * accumulating listeners per swap.
 */
export {}; // ES-module scope (bundled by Astro as a module <script>).

const STORAGE_KEY = "nabta-motion";
const MOTION_ATTR = "data-motion";
const OFF = "off";
const ON = "on";

/**
 * The effective-motion signal read by JS-driven motion: `true` when EITHER the OS
 * asks to reduce motion OR the in-page toggle is off. Independently triggerable.
 */
export function isEffectiveMotionOff(): boolean {
  const osReduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toggledOff = document.documentElement.dataset.motion === OFF;
  return osReduce || toggledOff;
}

/** Persisted user preference — only "off" is stored; anything else reads as "on". */
function storedMotionOff(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === OFF;
  } catch {
    return false; // storage unavailable (private mode / blocked) → default on
  }
}

/** Reflect the stored preference onto `<html data-motion>` (idempotent). */
function applyStored(): void {
  const html = document.documentElement;
  if (storedMotionOff()) html.setAttribute(MOTION_ATTR, OFF);
  else html.removeAttribute(MOTION_ATTR);
}

/**
 * Sync every toggle button's `aria-pressed` to the SITE-LEVEL motion preference
 * (pressed === the in-page toggle is off). This deliberately reflects only what
 * the button controls — the persisted `data-motion` override — NOT the combined
 * effective state. OS `prefers-reduced-motion` is a separate, authoritative signal
 * honoured by the CSS `@media reduce` block + `isEffectiveMotionOff()`; the button
 * neither mirrors nor can override it (motion the OS asked to suppress must never
 * be re-enabled here). Scoping `aria-pressed` to the manual bit also keeps it live
 * without a matchMedia change-listener.
 */
function syncButtons(): void {
  const off = document.documentElement.dataset.motion === OFF;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(
    "[data-motion-toggle]",
  )) {
    btn.setAttribute("aria-pressed", String(off));
  }
}

/** Flip the effective toggle, persist it, and re-sync the buttons. */
function toggleMotion(): void {
  const html = document.documentElement;
  const nowOff = html.dataset.motion !== OFF; // currently on → turning off
  try {
    localStorage.setItem(STORAGE_KEY, nowOff ? OFF : ON);
  } catch {
    /* storage unavailable — the attr still flips for this session */
  }
  if (nowOff) html.setAttribute(MOTION_ATTR, OFF);
  else html.removeAttribute(MOTION_ATTR);
  syncButtons();
}

/** Delegated click: fire only when the target is (inside) a toggle control. */
function onClick(event: Event): void {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-motion-toggle]"))
    toggleMotion();
}

/** Per-page-load init: re-apply the persisted attr + sync the freshly-rendered
 *  button (Header re-renders per page, so aria-pressed must be re-derived). */
function init(): void {
  applyStored();
  syncButtons();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("click", onClick);
