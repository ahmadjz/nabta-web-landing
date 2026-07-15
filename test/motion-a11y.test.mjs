// Motion a11y / perf / RTL-motion gate (LVR-TASK-09). A PURE source-scan over
// src/**/*.{astro,css} (no build needed; mirrors rtl-logical / motion-tokens /
// motion-primitives style — node:test, zero deps). This is the SINGLE owned,
// complete lint for the motion rules R1–R7; its runtime half lives in
// scripts/preview-smoke.mjs.
//
// It is deliberately SEPARATE from rtl-logical.test.mjs, which bans physical
// LAYOUT utilities but structurally CANNOT catch motion-DIRECTION bugs (verified:
// `translateX(-24px)`, `--slide-from:-24px`, `origin-left`, `background-position:
// left` all pass it). Widening rtl-logical's value-aware regex to chase those would
// false-positive on legitimate prose like `background-position: left`, so motion
// direction is owned HERE instead.
//
//   R1  a global @media (prefers-reduced-motion: reduce) override block exists.
//   R2  every @keyframes / CSS `transition` animates ONLY compositor-cheap props
//       (transform/opacity/filter/stroke-dashoffset/background-position) — never a
//       layout prop (top/left/right/bottom/width/height/margin/padding) or `all`.
//   R3  the reveal "from" state is JS-gated (html[data-motion-ready]); global.css
//       carries NO static `[data-reveal]{opacity:0|visibility:hidden}`.
//   R4  the hero <h1> (the LCP element) is reveal-free + opaque at the source.
//   R5  every motif/icon <svg> is decorative: aria-hidden="true", no role="img" /
//       <title> / tabindex, and intrinsic-dimensioned (viewBox or width+height).
//   R7  horizontal motion is direction-aware: no literal-sign/length `translateX()`
//       / `translate3d()` / `translate-x-*` utility — only `translateX(var(--slide-
//       from))`, which mirrors automatically per [dir].
//   scripts  src/scripts/* register on `astro:page-load` (re-fire after a
//       ClientRouter swap), never a once-only DOMContentLoaded.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

/** Recursively collect files under `dir` whose name ends in one of `exts`. */
function walk(dir, exts, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => full.endsWith(e))) acc.push(full);
  }
  return acc;
}

/** Strip CSS/JS block comments so explanatory prose (which freely quotes
 *  `translateX(...)`, `[data-reveal]{opacity:0}`, etc.) can't trip the scans. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** The CSS that ships for a source file: a `.css` file IS css; an `.astro` file's
 *  css is the concatenation of its `<style>` blocks (NOT its class attributes —
 *  Tailwind utilities are handled by the targeted markup guards below). */
function cssOf(file, text) {
  if (file.endsWith(".css")) return stripComments(text);
  let css = "";
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
    css += m[1] + "\n";
  return stripComments(css);
}

const SOURCES = walk(SRC, [".astro", ".css"]).map((file) => ({
  rel: relative(ROOT, file),
  text: readFileSync(file, "utf8"),
}));

// Layout-triggering properties that must never be ANIMATED (they force reflow,
// killing the compositor fast-path + spiking CLS). Matches the property name at a
// declaration LHS or a transition-property token, including longhands (margin-top…).
const LAYOUT = /^(?:top|left|right|bottom|width|height|margin|padding)(?:-|$)/;

// ── R1: a global reduce-motion override exists ───────────────────────────────
test("R1 global.css has a @media (prefers-reduced-motion: reduce) override", () => {
  assert.match(
    cssOf("global.css", read("src", "styles", "global.css")),
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
    "missing the global reduce-motion @media block (honours the OS setting for everyone)",
  );
});

// ── R2: GPU-only keyframes + transitions ─────────────────────────────────────
/** Pull each `@keyframes <name> { … }` body (balanced braces, nesting-safe). */
function keyframeBodies(css) {
  const bodies = [];
  const re = /@keyframes\s+[\w-]+/g;
  let m;
  while ((m = re.exec(css))) {
    let i = css.indexOf("{", m.index);
    if (i === -1) continue;
    let depth = 0;
    const start = i;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        i++;
        break;
      }
    }
    bodies.push(css.slice(start, i));
  }
  return bodies;
}

/** Property names on the LHS of declarations within a CSS block. */
function declaredProps(body) {
  return [...body.matchAll(/(?:^|[{;])\s*([a-zA-Z-]+)\s*:/g)].map((m) => m[1]);
}

test("R2 every @keyframes animates only compositor-cheap props (no layout reflow)", () => {
  const offenders = [];
  for (const { rel, text } of SOURCES) {
    for (const body of keyframeBodies(cssOf(rel, text))) {
      for (const prop of declaredProps(body)) {
        if (LAYOUT.test(prop))
          offenders.push(`${rel}: @keyframes animates "${prop}"`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `keyframes animating a LAYOUT property (use transform/opacity/filter instead):\n${offenders.join("\n")}`,
  );
});

test("R2 every CSS `transition` targets only compositor-cheap props (never layout/all)", () => {
  const offenders = [];
  // The `transition` shorthand or `transition-property` — NOT -duration/-delay/-timing.
  const re = /transition(?:-property)?\s*:\s*([^;}]+)/g;
  for (const { rel, text } of SOURCES) {
    const css = cssOf(rel, text);
    for (const m of css.matchAll(re)) {
      for (const entry of m[1].split(",")) {
        const prop = entry.trim().split(/\s+/)[0]; // property is the first token
        if (LAYOUT.test(prop) || prop === "all")
          offenders.push(`${rel}: transitions "${prop}"`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `transition targeting a layout property or \`all\` (animate transform/opacity instead):\n${offenders.join("\n")}`,
  );
});

// ── R3: the reveal from-state is JS-gated, never static CSS ───────────────────
/** Leaf CSS rules (selector + body) — innermost blocks only, so @layer/@media
 *  wrappers are transparent. */
function leafRules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2],
  }));
}

test("R3 global.css has NO static [data-reveal] hidden state (JS-gated only)", () => {
  const css = cssOf("global.css", read("src", "styles", "global.css"));
  const ungated = [];
  let gated = false;
  for (const { selector, body } of leafRules(css)) {
    if (!selector.includes("[data-reveal")) continue;
    const hides =
      /opacity\s*:\s*0(\b|;|\s|$)/.test(body) ||
      /visibility\s*:\s*hidden/.test(body);
    if (!hides) continue;
    if (selector.includes("data-motion-ready")) gated = true;
    else ungated.push(selector);
  }
  assert.deepEqual(
    ungated,
    [],
    `static (non-JS-gated) [data-reveal] hidden state(s) — gate behind html[data-motion-ready]:\n${ungated.join("\n")}`,
  );
  assert.ok(
    gated,
    "expected a JS-gated html[data-motion-ready] [data-reveal] from-state rule",
  );
});

// ── R4: the hero <h1> (LCP) is reveal-free + opaque at the source ─────────────
test("R4 hero <h1> is reveal-free + opaque (LCP paints without waiting on JS)", () => {
  const h1 = read("src", "components", "sections", "Hero.astro").match(
    /<h1\b[^>]*>/,
  );
  assert.ok(h1, "Hero.astro must render an <h1> (the LCP heading)");
  assert.ok(
    !/data-reveal/.test(h1[0]),
    "hero <h1> must NOT be a [data-reveal] target — its from-state is opacity:0, deferring the LCP",
  );
  assert.ok(
    !/\bopacity-0\b|opacity\s*:\s*0\b/.test(h1[0]),
    "hero <h1> must NOT start at opacity:0 — the LCP element paints fully opaque",
  );
});

// ── R5: decorative motif/icon SVGs ───────────────────────────────────────────
function svgFiles(rel) {
  const dir = join(SRC, "components", rel);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".astro"))
    .map((f) => ({
      rel: `${rel}/${f}`,
      text: readFileSync(join(dir, f), "utf8"),
    }));
}
const DECORATIVE = [...svgFiles("motifs"), ...svgFiles("icons")];

test("R5 the motif/icon set is non-empty (the scan has something to assert)", () => {
  assert.ok(
    DECORATIVE.length >= 10,
    `only ${DECORATIVE.length} motif/icon files found`,
  );
});

for (const { rel, text } of DECORATIVE) {
  for (const tag of text.match(/<svg\b[^>]*>/g) ?? []) {
    test(`R5 ${rel} <svg> is decorative + intrinsic-dimensioned`, () => {
      assert.match(
        tag,
        /aria-hidden="true"/,
        `${rel}: <svg> missing aria-hidden="true"`,
      );
      assert.ok(
        !/role="img"/.test(tag),
        `${rel}: decorative <svg> must not set role="img"`,
      );
      assert.ok(
        !/\btabindex/.test(tag),
        `${rel}: decorative <svg> must not be focusable (tabindex)`,
      );
      assert.ok(
        !/<title[\s>]/.test(text),
        `${rel}: decorative <svg> must not carry a <title>`,
      );
      const hasViewBox = /viewBox="/.test(tag);
      const hasWH = /\bwidth="/.test(tag) && /\bheight="/.test(tag);
      assert.ok(
        hasViewBox || hasWH,
        `${rel}: <svg> needs a viewBox or explicit width+height (no-CLS intrinsic sizing)`,
      );
    });
  }
}

// ── R7: direction-aware horizontal motion ────────────────────────────────────
// The ONLY sanctioned horizontal translate is translateX(var(--slide-from)) — the
// var flips sign per [dir], so RTL mirrors with zero literal signs. A literal
// translateX/translate3d, or a Tailwind translate-x-* utility, hard-codes a LTR
// direction that does NOT mirror in Arabic.
test("R7 every CSS translateX reads var(--slide-from) (no literal-sign horizontal motion)", () => {
  const offenders = [];
  let sawSlideFrom = false;
  for (const { rel, text } of SOURCES) {
    const css = cssOf(rel, text);
    // Capture the arg, tolerating ONE level of nested parens (so `var(--x)` is
    // read whole, not truncated at its inner `)`).
    for (const m of css.matchAll(
      /translateX\(\s*([^()]*(?:\([^()]*\))?[^()]*?)\s*\)/g,
    )) {
      if (m[1] === "var(--slide-from)") sawSlideFrom = true;
      else offenders.push(`${rel}: translateX(${m[1]})`);
    }
    for (const m of css.matchAll(/translate3d\(\s*([^,]*?)\s*,/g)) {
      const x = m[1].trim();
      if (x === "var(--slide-from)") sawSlideFrom = true;
      else if (!/^0[a-z%]*$/.test(x))
        offenders.push(`${rel}: translate3d(${x}, …)`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `literal-sign horizontal translate (use translateX(var(--slide-from)) so RTL mirrors):\n${offenders.join("\n")}`,
  );
  assert.ok(
    sawSlideFrom,
    "expected at least one translateX(var(--slide-from)) — the direction-aware horizontal reveal must be wired",
  );
});

test("R7 no Tailwind translate-x-*/transition-all escape hatches in markup", () => {
  const offenders = [];
  for (const { rel, text } of SOURCES) {
    // A non-zero translate-x-* (or -translate-x-*) hard-codes a physical X shift.
    for (const m of text.matchAll(
      /(?<![\w-])(-?translate-x-(?!0(?![\w./[]))[\w./%[\]-]+)/g,
    ))
      offenders.push(`${rel}: ${m[1]}`);
    // transition-all animates every property — including layout ones.
    if (/(?<![\w-])transition-all(?![\w-])/.test(text))
      offenders.push(`${rel}: transition-all`);
  }
  assert.deepEqual(
    offenders,
    [],
    `Tailwind motion escape hatches found (use --slide-from CSS / an explicit transition list):\n${offenders.join("\n")}`,
  );
});

// ── R1-twin: the motion-preference toggle's CSS neutralisation (LPV2-02) ──────
// reveal/ambient/scroll motion is 100% CSS, collapsed at runtime ONLY by the
// @media (prefers-reduced-motion: reduce) !important block (R1). A JS toggle that
// merely sets an <html> data-attr is INERT on that CSS motion — so global.css MUST
// carry a TWIN duration-collapse block keyed on html[data-motion="off"], with
// !important (to beat AmbientBackdrop's INLINE animation-duration). Only JS-driven
// motion (count-up + the later islands) reads the JS helper isEffectiveMotionOff().
test('R1-twin global.css collapses motion under html[data-motion="off"] (mirrors @media reduce)', () => {
  const css = cssOf("global.css", read("src", "styles", "global.css"));
  const rules = leafRules(css).filter(
    (r) =>
      /html\[data-motion="off"\]/.test(r.selector) && r.selector.includes("*"),
  );
  assert.ok(
    rules.length > 0,
    'missing the html[data-motion="off"] * duration-collapse twin of the @media reduce block',
  );
  const body = rules.map((r) => r.body).join("\n");
  assert.match(
    body,
    /animation-duration\s*:\s*[^;]*!important/,
    "twin must collapse animation-duration with !important (beats AmbientBackdrop's inline duration)",
  );
  assert.match(
    body,
    /transition-duration\s*:\s*[^;]*!important/,
    "twin must collapse transition-duration with !important",
  );
  // The twin MUST also target the ROOT html[data-motion="off"] itself, not only
  // its descendants: `html[data-motion="off"] *` (descendant combinator) can never
  // match <html>, and <html> is the document's scrolling box + the sole owner of
  // `scroll-behavior` — so a descendant-only twin leaves in-page anchors smooth-
  // scrolling under toggle-off. The @media reduce block matches <html> via bare `*`.
  const parts = rules.flatMap((r) =>
    r.selector.split(",").map((s) => s.trim()),
  );
  assert.ok(
    parts.includes('html[data-motion="off"]'),
    'the twin must also target the ROOT selector html[data-motion="off"] (bare, no descendant combinator) so it collapses <html>\'s scroll-behavior — mirror the @media reduce block',
  );
});

test("R1-twin count-up.ts reads the shared helper, not raw matchMedia(prefers-reduced-motion)", () => {
  const src = read("src", "scripts", "count-up.ts");
  assert.ok(
    !/matchMedia\(\s*["']\(prefers-reduced-motion/.test(src),
    "count-up.ts must NOT read prefers-reduced-motion via raw matchMedia — import isEffectiveMotionOff() from motion-pref.ts",
  );
  assert.match(
    src,
    /isEffectiveMotionOff/,
    "count-up.ts must call isEffectiveMotionOff() (the shared effective-motion signal)",
  );
});

test("R1-twin motion-pref.ts exports isEffectiveMotionOff() + inits on astro:page-load", () => {
  const src = read("src", "scripts", "motion-pref.ts");
  assert.match(
    src,
    /export\s+function\s+isEffectiveMotionOff\s*\(/,
    "motion-pref.ts must export isEffectiveMotionOff()",
  );
  assert.match(
    src,
    /addEventListener\(\s*["']astro:page-load["']/,
    "motion-pref.ts must re-apply the persisted preference on astro:page-load (survive a ClientRouter swap)",
  );
});

// ── count-up honesty (LPV2-05, owned here at LPV2-08) ─────────────────────────
// count-up.ts is the JS-driven motion that genuinely reads the effective-motion
// signal. Two honesty invariants belong in the motion-a11y gate (the SOURCE side;
// stats.test.mjs owns the complementary DIST side — that the built HTML server-
// renders the REAL fact, never "0"):
//   (a) the accessible value stays TRUE the whole time — the real number lives in
//       an `.sr-only` sibling while the 0→N number animates on an `aria-hidden`
//       sibling, so AT + no-JS readers never get a half-counted value.
//   (b) under isEffectiveMotionOff() the count SNAPS straight to the final value —
//       no 0→N ramp — so the effective-motion signal fully governs this JS motion.
test("count-up honesty: the REAL value is on an .sr-only node, the ANIMATED number on a DISTINCT aria-hidden node", () => {
  const src = read("src", "scripts", "count-up.ts");
  // Scope to arm() — the function that swaps the element's text for the sr-only +
  // animated pair — so a match elsewhere in the file can't stand in for it. funcSlice
  // (not funcBody) because arm's return type `{ display: HTMLElement }` has braces.
  const arm = funcSlice(src, "arm");
  assert.ok(
    arm,
    "count-up.ts must have an arm() that swaps the element's text for the sr-only real value + the animated number",
  );
  const srMatch = /(\w+)\.className\s*=\s*["']sr-only["']/.exec(arm);
  assert.ok(
    srMatch,
    "arm() must create an .sr-only node (className = 'sr-only')",
  );
  const srId = srMatch[1];
  // EVERY node marked aria-hidden="true" in arm() — matchAll, not just the FIRST
  // (.exec), so a SECOND aria-hidden appended onto the sr-only node can't hide behind
  // the legitimate first match.
  const hiddenIds = [
    ...arm.matchAll(
      /(\w+)\.setAttribute\(\s*["']aria-hidden["']\s*,\s*["']true["']\s*\)/g,
    ),
  ].map((m) => m[1]);
  assert.ok(
    hiddenIds.length > 0,
    "arm() must mark the ANIMATED number aria-hidden (aria-hidden='true')",
  );
  // The ANNOUNCED (.sr-only) node must carry the REAL value (realText), not the 0/
  // animated one — so AT + no-JS readers always get the true number.
  assert.match(
    arm,
    new RegExp(`\\b${srId}\\.textContent\\s*=\\s*realText\\b`),
    "the .sr-only node must carry the REAL value (realText)",
  );
  // …and the .sr-only real-value node must NEVER be aria-hidden itself (that would hide
  // the true number from assistive tech) — checked against EVERY aria-hidden node.
  assert.ok(
    !hiddenIds.includes(srId),
    `the .sr-only real-value node (${srId}) must NOT be aria-hidden — that hides the true number from AT`,
  );
  // …and a DISTINCT node must carry the aria-hidden animated number.
  assert.ok(
    hiddenIds.some((id) => id !== srId),
    "the animated number must be on a DISTINCT aria-hidden node (not the .sr-only one)",
  );
});

test("count-up honesty: run() SNAPS to the final value under isEffectiveMotionOff() (balanced-brace, no 0→N ramp)", () => {
  const src = read("src", "scripts", "count-up.ts");
  const run = funcBody(src, "run");
  assert.ok(run, "count-up.ts must have a run() that drives the count-up");
  // Extract the isEffectiveMotionOff() guard's block with BALANCED braces — a lazy
  // single-`}` regex would stop at the first nested block and miss a later regression.
  const at = run.search(/if\s*\(\s*isEffectiveMotionOff\(\)\s*\)\s*\{/);
  assert.ok(at !== -1, "run() must branch on isEffectiveMotionOff()");
  let i = run.indexOf("{", at);
  let depth = 0;
  const start = i;
  for (; i < run.length; i++) {
    if (run[i] === "{") depth++;
    else if (run[i] === "}" && --depth === 0) {
      i++;
      break;
    }
  }
  const guardBlock = run.slice(start, i);
  assert.match(
    guardBlock,
    /textContent\s*=\s*format\(\s*to\s*\)/,
    "under effective-motion-off, count-up must write the FINAL value (format(to)) to the display",
  );
  assert.match(
    guardBlock,
    /\breturn\b/,
    "the effective-motion-off branch must return — skip the rAF 0→N animation entirely",
  );
  // The rAF animation (schedule(...)) must sit OUTSIDE the motion-off branch — never
  // reached when motion is off (catches an animation smuggled into a nested sub-path).
  assert.ok(
    !/schedule\s*\(/.test(guardBlock),
    "the rAF animation (schedule(...)) must NOT be inside the motion-off branch — it must be skipped entirely",
  );
});

// ── scripts: ClientRouter-lifecycle-aware init ───────────────────────────────
for (const file of walk(join(SRC, "scripts"), [".ts", ".js", ".mjs"])) {
  const rel = relative(ROOT, file);
  test(`scripts ${rel} inits on astro:page-load (re-fires after a ClientRouter swap)`, () => {
    const src = readFileSync(file, "utf8");
    assert.match(
      src,
      /addEventListener\(\s*["']astro:page-load["']/,
      `${rel}: must register init on document "astro:page-load"`,
    );
    assert.ok(
      !/DOMContentLoaded/.test(src),
      `${rel}: must NOT gate init on a once-only DOMContentLoaded (won't re-fire post-swap)`,
    );
  });
}

// ── LPV2-03: the ONE Motion island — the scoped ban-lift + its guards ─────────
// CLAUDE.md D-site-4 bans third-party libs in dist JS. LPV2 lifts that for EXACTLY
// one bundled, same-origin, WAAPI-based island — Motion (`motion` npm) — driving the
// signature pointer-reactive hero foliage (ADR-41). These tests are the enforceable
// TEETH of the scoped lift + the correctness bounds that keep it honest.

// A. Import allowlist — the ban-lift's teeth. The ONLY third-party (bare, non-relative)
//    module import allowed in CLIENT JS (src/scripts/* + <script> blocks in .astro) is
//    `motion` (allow motion / motion/mini / motion-dom). ANY other bare import re-opens
//    the ban and FAILS. Relative imports (./ ../) are always fine. Frontmatter imports
//    are NOT scanned — that's SSR/build-time code, bundled server-side, never shipped
//    to the client (that's where @fontsource/* + astro:* legitimately live).
const MOTION_ALLOW = new Set(["motion", "motion/mini", "motion-dom"]);

/** Every module specifier imported by CLIENT-shipped JS: each src/scripts/* module,
 *  plus the body of every NON-inline <script> block in a .astro file. */
function clientImportSpecifiers() {
  const out = [];
  const add = (rel, code) => {
    const c = stripComments(code);
    for (const m of c.matchAll(/\bimport\b[^'"]*?\bfrom\s*["']([^"']+)["']/g))
      out.push({ rel, spec: m[1] });
    for (const m of c.matchAll(/\bimport\s*["']([^"']+)["']/g))
      out.push({ rel, spec: m[1] });
    for (const m of c.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g))
      out.push({ rel, spec: m[1] });
    for (const m of c.matchAll(/\bexport\b[^'"]*?\bfrom\s*["']([^"']+)["']/g))
      out.push({ rel, spec: m[1] });
  };
  for (const file of walk(join(SRC, "scripts"), [".ts", ".js", ".mjs"]))
    add(relative(ROOT, file), readFileSync(file, "utf8"));
  for (const { rel, text } of SOURCES) {
    if (!rel.endsWith(".astro")) continue;
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bis:inline\b/.test(m[1])) continue; // inline scripts aren't module-bundled
      add(rel, m[2]);
    }
  }
  return out;
}

test("LPV2-03 allowlist: `motion` is the ONLY third-party client import (ban-lift teeth)", () => {
  const bare = clientImportSpecifiers().filter(
    ({ spec }) => !spec.startsWith(".") && !spec.startsWith("/"),
  );
  const offenders = bare.filter(({ spec }) => !MOTION_ALLOW.has(spec));
  assert.deepEqual(
    offenders.map((o) => `${o.rel} → ${o.spec}`),
    [],
    "ONLY `motion` (motion/mini/motion-dom) may be a third-party client import — any other bare import re-opens the D-site-4 ban",
  );
  // …and the allowlist must actually be exercised (the island IS wired) — otherwise
  // a green suite would just mean nobody imports anything, not that the lift is live.
  assert.ok(
    bare.some(({ spec }) => MOTION_ALLOW.has(spec)),
    "expected the bundled `motion` import (the scoped ban-lift island must be wired)",
  );
});

// B. Signature a11y — the foliage layer(s) mirror AmbientBackdrop: aria-hidden +
//    pointer-events-none + out-of-flow BEHIND content. They must never intercept a
//    click and never become the LCP.
test("LPV2-03 signature a11y: hero foliage is decorative, click-through + out-of-flow (-z-10)", () => {
  const hero = read("src", "components", "sections", "Hero.astro");
  const tag = hero.match(/<div[^>]*\bhero-foliage\b[^>]*>/);
  assert.ok(tag, "Hero.astro must render a .hero-foliage container");
  assert.match(tag[0], /aria-hidden="true"/, "foliage must be aria-hidden");
  assert.match(
    tag[0],
    /pointer-events-none/,
    "foliage must be pointer-events-none (never intercept a click)",
  );
  assert.match(
    tag[0],
    /-z-10/,
    "foliage must sit behind content (-z-10 — never the LCP)",
  );
  assert.match(
    tag[0],
    /\babsolute\b/,
    "foliage must be out-of-flow (absolute)",
  );
});

// C. Effective-motion guard — Motion does NOT auto-honour prefers-reduced-motion, so
//    the island MUST early-return static on isEffectiveMotionOff() (LPV2-02). Do not
//    weaken this to trust the lib.
test("LPV2-03 guard: hero-signature.ts early-returns on isEffectiveMotionOff() + gates the parallax on pointer:fine (never trusts the lib)", () => {
  const src = read("src", "scripts", "hero-signature.ts");
  assert.match(
    src,
    /import\s*\{[^}]*\bisEffectiveMotionOff\b[^}]*\}\s*from\s*["']\.\/motion-pref["']/,
    "hero-signature.ts must import isEffectiveMotionOff from ./motion-pref",
  );
  assert.match(
    src,
    /if\s*\(\s*isEffectiveMotionOff\(\)\s*\)\s*return/,
    "hero-signature.ts must early-return static when isEffectiveMotionOff() — Motion has NO built-in reduce-motion",
  );
  // The pointer-parallax path is desktop-only: it must GATE on (pointer: fine) with a
  // real early-return, not merely mention the query. Assert the const binds the query
  // AND the `if (!matchMedia(...).matches) return` construct exists (mirrors the
  // isEffectiveMotionOff early-return above + the magnetic guard below) — a bare
  // presence match would pass even if the matchMedia result were discarded (parallax
  // then arms on touch too).
  assert.match(
    src,
    /FINE_POINTER\s*=\s*["']\(\s*pointer\s*:\s*fine\s*\)["']/,
    "hero-signature.ts must define FINE_POINTER = '(pointer: fine)'",
  );
  assert.match(
    src,
    /if\s*\(\s*!\s*window\.matchMedia\(\s*FINE_POINTER\s*\)\.matches\s*\)\s*return/,
    "hero-signature.ts must early-return when NOT (pointer: fine) — no parallax on touch (a discarded matchMedia must not slip through)",
  );
});

/** Body of a top-level `function <name>() { … }` via brace matching (nesting-safe).
 *  NOTE: takes the FIRST `{` after the signature, so it is unsafe for a function whose
 *  RETURN TYPE annotation contains braces (`function f(): { x: T } { … }`) — use
 *  funcSlice for those (e.g. count-up's arm()). Fine for void/no-brace-type functions
 *  (teardown, run) where the first `{` IS the body. */
function funcBody(src, name) {
  const sig = new RegExp(`function\\s+${name}\\s*\\(`).exec(src);
  if (!sig) return null;
  let i = src.indexOf("{", sig.index);
  if (i === -1) return null;
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      i++;
      break;
    }
  }
  return src.slice(start, i);
}

/** Source of `function <name>` up to the next top-level `function` (or EOF). Brace-
 *  agnostic, so it is robust to a TS return-type annotation with braces where funcBody
 *  would mis-anchor. Relies on the module's flat, ordered function layout. */
function funcSlice(src, name) {
  const start = src.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start === -1) return null;
  const rest = src.slice(start + 1);
  const next = rest.search(/\nfunction\s+\w+\s*\(/);
  return next === -1 ? src.slice(start) : src.slice(start, start + 1 + next);
}

// D. STRONG teardown — a persistent pointermove added per ClientRouter swap without
//    removal is an ACCUMULATING leak (worse than reveal.ts's one-shot observer). The
//    astro:before-swap handler must removeEventListener its pointer listeners AND
//    .stop()/.cancel() its Motion animate() handle (a WAAPI animation outlives a swap).
test("LPV2-03 teardown: astro:before-swap removes the pointer listeners + stops the animation", () => {
  const src = read("src", "scripts", "hero-signature.ts");
  const reg =
    /addEventListener\(\s*["']astro:before-swap["']\s*,\s*(\w+)\s*\)/.exec(src);
  assert.ok(
    reg,
    "hero-signature.ts must register an astro:before-swap teardown handler",
  );
  const body = funcBody(src, reg[1]);
  assert.ok(body, `could not locate the '${reg[1]}' teardown function body`);
  assert.match(
    body,
    /removeEventListener\(\s*["']pointermove["']/,
    "teardown must removeEventListener('pointermove', …) — the per-swap pointermove leaks otherwise",
  );
  assert.match(
    body,
    /\.(stop|cancel)\(\)/,
    "teardown must .stop()/.cancel() the Motion animate() handle (a WAAPI animation outlives the swap)",
  );
  // …and the styleEffect binding — the pointer-parallax DOM write — must be cancelled
  // too (its own cleanup fn), else the springs keep writing transforms post-swap.
  assert.match(
    body,
    /cancelStyle\(\)/,
    "teardown must call the styleEffect cleanup (cancelStyle()) — the parallax DOM-write subscription outlives the swap otherwise",
  );
});

// ── R8: scroll-timeline (animation-timeline) dual neutralisation (LPV2-04) ────
// CSS scroll-driven animations (animation-timeline: view()/scroll()) are
// PROGRESS-based, not time-based — so the two duration-collapse blocks (the R1
// @media reduce `*` block AND its R1-twin html[data-motion="off"] `*` block) do
// NOT stop them (a scroll/view timeline ignores animation-duration). Each such
// rule therefore needs an EXPLICIT `animation-timeline: none !important` under
// BOTH effective-motion signals; reverting to the (absent) document timeline lets
// the duration-collapse finish the job → the element rests at its keyframes'
// identity end-state (visible, unmoved). R8 FAILS if only one form exists — the
// silent-violation trap this whole task exists to close.

/** Balanced-brace bodies of every at-rule whose prelude matches `preludeRe`
 *  (nesting-safe — the inner rules keep their own braces). */
function atRuleBodies(css, preludeRe) {
  const bodies = [];
  const re = new RegExp(preludeRe.source, "g");
  let m;
  while ((m = re.exec(css))) {
    let i = css.indexOf("{", m.index);
    if (i === -1) continue;
    let depth = 0;
    const start = i;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        i++;
        break;
      }
    }
    bodies.push(css.slice(start, i));
  }
  return bodies;
}

const REDUCE_MEDIA_RE =
  /@media\s*\([^)]*prefers-reduced-motion[^)]*reduce[^)]*\)/;
const stripWs = (s) => s.replace(/\s+/g, "");

test("R8 scroll-timeline: every animation-timeline scroll/view selector is neutralised under BOTH reduce-motion AND html[data-motion=off]", () => {
  const css = cssOf("global.css", read("src", "styles", "global.css"));

  // (0) collect the individual selectors that SET a scroll/view timeline. The
  //     feature must be wired (else a green R8 just means nobody uses one).
  const setterSelectors = new Set();
  for (const r of leafRules(css)) {
    if (!/animation-timeline\s*:\s*(?:view|scroll)\s*\(/.test(r.body)) continue;
    for (const s of r.selector.split(",")) setterSelectors.add(s.trim());
  }
  assert.ok(
    setterSelectors.size > 0,
    "expected at least one `animation-timeline: view()/scroll()` rule (the scroll choreography must be wired)",
  );

  // (a) reduce-motion neutraliser selectors: leaf rules INSIDE a @media reduce
  //     block that collapse animation-timeline to none !important.
  const reduceSelectors = new Set(
    atRuleBodies(css, REDUCE_MEDIA_RE)
      .flatMap((body) => leafRules(body))
      .filter((r) => /animation-timeline\s*:\s*none\s*!important/.test(r.body))
      .flatMap((r) => r.selector.split(",").map((s) => s.trim())),
  );

  // (b) toggle neutraliser TARGET selectors: top-level html[data-motion="off"]
  //     rules collapsing animation-timeline to none !important — the target is the
  //     token AFTER the html[data-motion="off"] prefix.
  const toggleTargets = new Set();
  for (const r of leafRules(css)) {
    if (!/animation-timeline\s*:\s*none\s*!important/.test(r.body)) continue;
    for (const s of r.selector.split(",")) {
      const m = /^html\[data-motion="off"\]\s+(.+)$/.exec(s.trim());
      if (m) toggleTargets.add(m[1].trim());
    }
  }

  // Every scroll-timeline setter selector must be neutralised under BOTH forms —
  // fail if EITHER is missing for ANY selector (the silent-violation trap: a bare
  // substring match would miss one selector dropped from just one form).
  for (const sel of setterSelectors) {
    assert.ok(
      reduceSelectors.has(sel),
      `scroll-timeline selector ${sel} is NOT neutralised under @media (prefers-reduced-motion: reduce) — add \`animation-timeline: none !important\` for it`,
    );
    assert.ok(
      toggleTargets.has(sel),
      `scroll-timeline selector ${sel} is NOT neutralised under html[data-motion="off"] — add the toggle twin for it`,
    );
  }
});

// ── View-transition crossfade fallback (LPV2-04) ─────────────────────────────
// The named crossfade (Base.astro, on a LOCALE-INVARIANT element) must not
// animate under reduce-motion OR the in-page toggle. Astro's ClientRouter
// self-skips its animation under OS reduce-motion, but the data-motion toggle is
// OUR signal it can't see — so global.css must neutralise the generated
// ::view-transition-* pseudo-element tree (originated on the root <html>) under
// BOTH signals with `animation: none !important`.
test("view-transition: ::view-transition-* pseudo-elements get animation:none under BOTH reduce-motion AND html[data-motion=off]", () => {
  const css = cssOf("global.css", read("src", "styles", "global.css"));

  // (a) reduce-motion form — a ::view-transition-* rule under @media reduce that
  //     sets animation:none !important (distinct from `animation-timeline:none`).
  const reduceBodies = atRuleBodies(css, REDUCE_MEDIA_RE).map(stripWs).join("");
  assert.match(
    reduceBodies,
    /::view-transition-(?:group|old|new)\([^)]*\)[^{}]*\{[^{}]*animation:none!important/,
    "missing a ::view-transition-* { animation: none !important } fallback under @media (prefers-reduced-motion: reduce)",
  );

  // (b) toggle form — html[data-motion="off"]::view-transition-* { animation: none }
  const toggleVt = leafRules(css).filter(
    (r) =>
      /html\[data-motion="off"\]::view-transition-(?:group|old|new)/.test(
        r.selector,
      ) && /animation\s*:\s*none\s*!important/.test(r.body),
  );
  assert.ok(
    toggleVt.length > 0,
    "missing an html[data-motion=\"off\"]::view-transition-* { animation: none !important } twin (the toggle can't reach Astro's reduce-motion self-skip)",
  );
});

// ── LPV2-04: the magnetic-CTA island — the SAME guards as the hero signature ──
// magnetic.ts reuses the Motion spring (03) on the primary CTA. Motion has no
// built-in reduce-motion, so — exactly like hero-signature.ts — it must gate on
// isEffectiveMotionOff(), run on pointer:fine only, and fully tear down on
// astro:before-swap (a document-level pointermove added per swap without removal
// is an accumulating leak).
test("LPV2-04 guard: magnetic.ts early-returns on isEffectiveMotionOff() + pointer:fine only (never trusts the lib)", () => {
  const src = read("src", "scripts", "magnetic.ts");
  assert.match(
    src,
    /import\s*\{[^}]*\bisEffectiveMotionOff\b[^}]*\}\s*from\s*["']\.\/motion-pref["']/,
    "magnetic.ts must import isEffectiveMotionOff from ./motion-pref",
  );
  assert.match(
    src,
    /if\s*\(\s*isEffectiveMotionOff\(\)\s*\)\s*return/,
    "magnetic.ts must early-return static when isEffectiveMotionOff() — Motion has NO built-in reduce-motion",
  );
  assert.match(
    src,
    /FINE_POINTER\s*=\s*["']\(\s*pointer\s*:\s*fine\s*\)["']/,
    "magnetic.ts must define FINE_POINTER = '(pointer: fine)'",
  );
  assert.match(
    src,
    /if\s*\(\s*!\s*window\.matchMedia\(\s*FINE_POINTER\s*\)\.matches\s*\)\s*return/,
    "magnetic.ts must early-return when NOT (pointer: fine) — no magnetic pull on touch (a discarded matchMedia must not slip through)",
  );
});

test("LPV2-04 teardown: magnetic.ts removes its pointer listener + stops the spring on astro:before-swap", () => {
  const src = read("src", "scripts", "magnetic.ts");
  const reg =
    /addEventListener\(\s*["']astro:before-swap["']\s*,\s*(\w+)\s*\)/.exec(src);
  assert.ok(
    reg,
    "magnetic.ts must register an astro:before-swap teardown handler",
  );
  const body = funcBody(src, reg[1]);
  assert.ok(body, `could not locate the '${reg[1]}' teardown function body`);
  assert.match(
    body,
    /removeEventListener\(\s*["']pointermove["']/,
    "teardown must removeEventListener('pointermove', …) — the per-swap document pointermove leaks otherwise",
  );
  assert.match(
    body,
    /removeEventListener\(\s*["']pointerleave["']/,
    "teardown must removeEventListener('pointerleave', …) — the per-swap document pointerleave leaks otherwise",
  );
  assert.match(
    body,
    /\.stop\(\)|cancelStyle\(\)/,
    "teardown must .stop() the spring / cancel the styleEffect binding (the parallax DOM-write outlives the swap otherwise)",
  );
});
