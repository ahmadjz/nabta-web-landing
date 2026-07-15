/**
 * Signature hero interaction (LPV2-03) — pointer-reactive layered foliage.
 *
 * THE scoped lift of the "no third-party libs in dist JS" ban (CLAUDE.md D-site-4 /
 * ADR-41): this is the ONE island allowed to bundle a trusted third-party lib —
 * Motion (`motion` npm, WAAPI-based) — bundled SAME-ORIGIN into /_astro, so "zero
 * third-party REQUESTS" still holds (the site fetches nothing off-origin). The
 * `motion`-only import allowlist in test/motion-a11y.test.mjs is the ban-lift's
 * TEETH: any OTHER bare third-party import fails the suite.
 *
 * ⚠️ Motion does NOT reliably honour reduced motion, so this island MUST gate
 * itself — it early-returns to a fully static state on `isEffectiveMotionOff()`
 * (OS reduce OR the in-page toggle, LPV2-02) BEFORE any Motion call. Precisely:
 * `animate()` (the idle drift) auto-suppresses positional transforms under the OS
 * `prefers-reduced-motion` query, but `springValue`/`styleEffect` (the pointer
 * parallax) do NOT, and NEITHER path honours the in-page `data-motion` toggle. So
 * the app-level gate is load-bearing for the parallax path and for the toggle in
 * general — never lean on the lib's partial OS-only heuristic. (The CSS reveal/
 * ambient motion is separately collapsed by the global `@media reduce` block + its
 * `html[data-motion="off"]` twin; this JS island gets no such free a11y.)
 *
 * Bounds that keep it honest:
 *   - `pointer:fine` ONLY — no pointer parallax on touch (matchMedia gate). Touch +
 *     no-JS get static decorative foliage; the reactive layer is a desktop nicety.
 *   - the foliage layers are aria-hidden + pointer-events-none + `-z-10` (Hero.astro),
 *     capped in footprint: invisible to AT, never intercept a click, never the LCP
 *     (the `<h1>` stays the Largest Contentful Paint — opaque + reveal-free, R4).
 *   - rAF-throttled: at most one pointer READ per frame; Motion's `styleEffect` does
 *     at most one transform WRITE per frame (its frameloop render step).
 *   - armed AFTER first paint (on `astro:page-load`), so first paint is text-only
 *     (protects LCP + INP).
 *   - STRONG teardown on `astro:before-swap`: a persistent `pointermove` added per
 *     swap WITHOUT removal is an ACCUMULATING leak (stronger than reveal.ts's
 *     one-shot observer) — so we removeEventListener each, `.stop()` the animations,
 *     and cancel the style bindings.
 */
import { animate, springValue, styleEffect, type MotionValue } from "motion";
import { isEffectiveMotionOff } from "./motion-pref";

export {}; // ES-module scope (bundled by Astro as a module <script>).

const FINE_POINTER = "(pointer: fine)";
/** Cap the parallax travel — subtle, and never large enough to shove a layer far
 *  enough to out-paint the `<h1>` (LCP protection). */
const MAX_SHIFT_PX = 26;
/** Idle vertical-bob amplitude on the inner motif wrappers. */
const DRIFT_PX = 12;

interface Layer {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number; // 0..1 parallax intensity (from data-depth)
  cancelStyle: () => void; // styleEffect cleanup
}

/** Minimal shape we hold onto for teardown (Motion's controls expose more). */
type StoppableAnim = { stop: () => void };

let section: HTMLElement | null = null;
let layers: Layer[] = [];
let driftAnims: StoppableAnim[] = [];
let onMove: ((event: PointerEvent) => void) | null = null;
let onLeave: (() => void) | null = null;
let frameId = 0;
let pending: { nx: number; ny: number } | null = null;

const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

/** rAF callback (one per frame): push the latest normalised pointer offset into the
 *  springs. Motion then writes the transform once per frame via styleEffect. */
function flush(): void {
  frameId = 0;
  if (!pending) return;
  const { nx, ny } = pending;
  for (const layer of layers) {
    layer.x.set(nx * layer.depth * MAX_SHIFT_PX);
    layer.y.set(ny * layer.depth * MAX_SHIFT_PX);
  }
}

/** Pointer move over the hero → normalise to [-1,1] from centre; rAF-throttle so at
 *  most one read (and one spring update) lands per frame. */
function handleMove(event: PointerEvent): void {
  if (!section) return;
  const rect = section.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  pending = {
    nx: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1),
    ny: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1),
  };
  if (!frameId) frameId = requestAnimationFrame(flush);
}

/** Pointer left the hero → ease every layer back home. */
function handleLeave(): void {
  pending = { nx: 0, ny: 0 };
  if (!frameId) frameId = requestAnimationFrame(flush);
}

function teardown(): void {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
  if (section && onMove) section.removeEventListener("pointermove", onMove);
  if (section && onLeave) section.removeEventListener("pointerleave", onLeave);
  for (const anim of driftAnims) anim.stop();
  for (const layer of layers) {
    layer.x.stop(); // halt any in-flight spring before dropping the DOM subscriber
    layer.y.stop();
    layer.cancelStyle(); // unhook styleEffect's per-frame transform write
  }
  driftAnims = [];
  layers = [];
  pending = null;
  onMove = null;
  onLeave = null;
  section = null;
}

function init(): void {
  teardown(); // idempotent: clear any prior wiring before re-arming after a swap.

  const host = document.querySelector<HTMLElement>("[data-hero-signature]");
  if (!host) return;

  // A11y gate FIRST — before any Motion call. Load-bearing for the parallax path +
  // the in-page toggle (Motion's own reduce heuristic covers neither). Stay static.
  if (isEffectiveMotionOff()) return;

  section = host;

  // Idle drift (Motion) — a gentle vertical bob on the inner motif wrappers, running
  // while motion is on. It lives on a DIFFERENT element than the pointer-parallax
  // layer, so the two never fight over one element's transform.
  const drifters = Array.from(
    host.querySelectorAll<HTMLElement>(".hero-foliage__drift"),
  );
  driftAnims = drifters.map((el, i) =>
    animate(
      el,
      { y: [0, -DRIFT_PX, 0] },
      {
        duration: 7 + i * 1.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: i * 0.4,
      },
    ),
  );

  // Pointer parallax — `pointer:fine` ONLY (no parallax on touch; the idle drift
  // above still runs there).
  if (!window.matchMedia(FINE_POINTER).matches) return;

  layers = Array.from(
    host.querySelectorAll<HTMLElement>(".hero-foliage__layer"),
  ).map((el) => {
    // Number("0") is falsy, so `|| 0.5` would silently override an intentional
    // depth-0 (static) layer — guard on NaN instead.
    const parsed = Number(el.dataset.depth);
    const depth = Number.isNaN(parsed) ? 0.5 : parsed;
    const x = springValue<number>(0);
    const y = springValue<number>(0);
    const cancelStyle = styleEffect(el, { x, y });
    return { x, y, depth, cancelStyle };
  });
  if (layers.length === 0) return;

  onMove = handleMove;
  onLeave = handleLeave;
  section.addEventListener("pointermove", onMove);
  section.addEventListener("pointerleave", onLeave);
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", teardown);
