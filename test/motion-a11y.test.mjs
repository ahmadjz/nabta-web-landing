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
