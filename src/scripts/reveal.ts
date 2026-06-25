/**
 * Scroll-reveal machinery — ClientRouter-lifecycle-aware from day one (LVR-02).
 *
 * An IntersectionObserver adds `.is-revealed` to each `[data-reveal]` element once
 * it scrolls into view, then unobserves it. The hidden "from" state lives behind
 * `html[data-motion-ready]` (set HERE, by JS) so no-JS visitors, crawlers and
 * Lighthouse always see fully-visible content — never a static
 * `[data-reveal]{opacity:0}` in CSS (R3).
 *
 * Init runs on `astro:page-load` — which fires on the first load AND after every
 * ClientRouter swap (the router lands in LVR-03), so reveals re-fire after a
 * client navigation. Each fire only observes not-yet-revealed nodes (idempotent);
 * a stale observer is disconnected on `astro:before-swap`. Under
 * `prefers-reduced-motion: reduce` elements still reveal — instantly, because the
 * global reduce-motion CSS collapses the transition.
 */
export {}; // ES-module scope (bundled by Astro as a module <script>).

const REVEAL_CLASS = "is-revealed";
const READY_ATTR = "data-motion-ready";

let observer: IntersectionObserver | null = null;

function markRevealed(el: Element): void {
  el.classList.add(REVEAL_CLASS);
}

function init(): void {
  // Flag JS-ready so the opacity/transform "from" CSS engages only with JS.
  document.documentElement.setAttribute(READY_ATTR, "");

  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-reveal]:not(.${REVEAL_CLASS})`,
    ),
  );
  if (nodes.length === 0) return;

  // Feature-guard IntersectionObserver/matchMedia — degrade to instant reveal.
  if (!("IntersectionObserver" in window)) {
    nodes.forEach(markRevealed);
    return;
  }

  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        markRevealed(entry.target);
        obs.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
  );

  for (const node of nodes) observer.observe(node);
}

function teardown(): void {
  observer?.disconnect();
  observer = null;
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", teardown);
