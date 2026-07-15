/**
 * Count-up animation — ClientRouter-lifecycle-aware (LVR-02). Dormant until a
 * section opts in with `[data-count-up]` + a numeric `data-count-to`; only used if
 * a page has a real stat.
 *
 * Accessibility-first: the element's REAL final value stays its accessible text
 * the entire time. The visible number animates on an `aria-hidden` sibling while
 * an `.sr-only` sibling carries the true value — so assistive tech and no-JS
 * readers always get the real number, never a half-counted one. rAF-driven,
 * IntersectionObserver-triggered once. It snaps straight to the final value under
 * the shared effective-motion signal (OS `prefers-reduced-motion` OR the in-page
 * toggle) — this is the JS-driven motion that genuinely reads the helper.
 *
 * Same `astro:page-load` init as reveal.ts, so it re-arms after a ClientRouter
 * swap; a stale observer is disconnected AND every in-flight rAF is cancelled on
 * `astro:before-swap` (so an animation mid-run doesn't leak across a swap).
 */
import { isEffectiveMotionOff } from "./motion-pref";

const DONE_ATTR = "data-count-done";
const DURATION_MS = 1200;

let observer: IntersectionObserver | null = null;
// Pending rAF ids — cancelled on teardown so a mid-run count-up can't outlive a
// ClientRouter swap (the pre-existing leak: the id was never stored).
const frameIds = new Set<number>();

/** requestAnimationFrame that tracks its id for teardown-time cancellation. */
function schedule(fn: FrameRequestCallback): void {
  const id = requestAnimationFrame((now) => {
    frameIds.delete(id);
    fn(now);
  });
  frameIds.add(id);
}

function format(value: number): string {
  return Math.round(value).toLocaleString();
}

/** Swap the element's text for [sr-only real value] + [aria-hidden animated]. */
function arm(el: HTMLElement, to: number): { display: HTMLElement } {
  const suffix = el.getAttribute("data-count-suffix") ?? "";
  const realText = (el.textContent ?? "").trim() || format(to) + suffix;

  const a11y = document.createElement("span");
  a11y.className = "sr-only";
  a11y.textContent = realText;

  const display = document.createElement("span");
  display.setAttribute("aria-hidden", "true");
  display.textContent = format(0) + suffix;

  el.replaceChildren(a11y, display);
  return { display };
}

function run(el: HTMLElement): void {
  if (el.hasAttribute(DONE_ATTR)) return;
  const to = Number(el.getAttribute("data-count-to"));
  if (!Number.isFinite(to)) return;
  el.setAttribute(DONE_ATTR, "");

  const suffix = el.getAttribute("data-count-suffix") ?? "";
  const { display } = arm(el, to);

  if (isEffectiveMotionOff()) {
    display.textContent = format(to) + suffix;
    return;
  }

  let start: number | null = null;
  const step = (now: number): void => {
    if (start === null) start = now;
    const progress = Math.min((now - start) / DURATION_MS, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    display.textContent = format(to * eased) + suffix;
    if (progress < 1) schedule(step);
    else display.textContent = format(to) + suffix;
  };
  schedule(step);
}

function init(): void {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-count-up]:not([${DONE_ATTR}])`,
    ),
  );
  if (nodes.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    nodes.forEach(run);
    return;
  }

  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target as HTMLElement);
        obs.unobserve(entry.target);
      }
    },
    { threshold: 0.4 },
  );

  for (const node of nodes) observer.observe(node);
}

function teardown(): void {
  observer?.disconnect();
  observer = null;
  for (const id of frameIds) cancelAnimationFrame(id);
  frameIds.clear();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", teardown);
