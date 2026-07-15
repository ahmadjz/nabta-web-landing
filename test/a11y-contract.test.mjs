// Cross-cutting a11y contract (LPV2-TASK-02). A PURE source-scan over
// src/**/*.{astro,css} (no build; node:test, zero deps) mirroring the
// motion-a11y / rtl-logical style. Owns the three chrome-wide a11y rules the
// web-design-guidelines audit surfaced that a per-section test can't hold:
//
//   T1  Target size — every STANDALONE interactive control (the language pill,
//       the shared Button skin, the FAQ <summary>, the Footer legal + mailto
//       links, the Contact channel chips, the motion toggle) resolves to a
//       min-block-size ≥ 44px (WCAG 2.5.8). Measured from the height utilities
//       (min-h-* OR block padding + a conservative single text line), NOT mere
//       class presence. Inline links inside flowing prose are exempt.
//   T2  Focus-not-obscured — the in-page scroll/anchor destinations under the
//       STICKY Header carry `scroll-margin-block-start` (≈ header height), so an
//       anchored/focused target lands below the bar, not hidden behind it
//       (WCAG 2.4.11).
//   T3  Focus-visible not removed — no interactive element suppresses the focus
//       outline (`outline:none` / `outline-0` / `outline-none`) without a
//       replacement ring. The site owns focus via the global `:focus-visible`
//       outline (+ the forest-band cream override); it is never stripped.

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

/** Strip CSS/JS block comments so explanatory prose can't trip the scans. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

// ── T1: target size ≥ 44px ───────────────────────────────────────────────────
// WCAG 2.5.8 Target Size (Minimum). We estimate an element's min block size from
// its Tailwind classes: the larger of any explicit `min-h-*` and (block padding +
// a conservative single line of text). CONTENT_LINE_PX is deliberately small
// (~1.25rem) so the padding path only "passes" a control that is genuinely tall
// enough on its own — it never inflates a thin control to a false pass.
const MIN_TARGET_PX = 44;
const CONTENT_LINE_PX = 20; // a conservative single line of text (~1.25rem)
const REM = 16;

/** Largest `min-h-*` utility in a class string, in px (0 if none). */
function minHeightPx(cls) {
  let px = 0;
  for (const m of cls.matchAll(/(?<![\w-])min-h-(\[[^\]]+\]|\d+(?:\.\d+)?)/g)) {
    const tok = m[1];
    if (tok.startsWith("[")) {
      const v = tok.slice(1, -1);
      if (v.endsWith("px")) px = Math.max(px, parseFloat(v));
      else if (v.endsWith("rem")) px = Math.max(px, parseFloat(v) * REM);
    } else {
      px = Math.max(px, parseFloat(tok) * 4); // Tailwind spacing: n → n*0.25rem
    }
  }
  return px;
}

/** Total vertical padding (top+bottom) from py / pt / pb utilities, in px. */
function blockPaddingPx(cls) {
  const one = (re) => {
    let px = 0;
    for (const m of cls.matchAll(re)) {
      const tok = m[1];
      if (tok.startsWith("[")) {
        const v = tok.slice(1, -1);
        if (v.endsWith("px")) px = Math.max(px, parseFloat(v));
        else if (v.endsWith("rem")) px = Math.max(px, parseFloat(v) * REM);
      } else px = Math.max(px, parseFloat(tok) * 4);
    }
    return px;
  };
  const py = one(/(?<![\w-])py-(\[[^\]]+\]|\d+(?:\.\d+)?)/g);
  const pt = one(/(?<![\w-])pt-(\[[^\]]+\]|\d+(?:\.\d+)?)/g);
  const pb = one(/(?<![\w-])pb-(\[[^\]]+\]|\d+(?:\.\d+)?)/g);
  return py * 2 + pt + pb; // py applies to both edges
}

/** Estimated min block size of a control from its utility classes. */
const minBlockPx = (cls) =>
  Math.max(minHeightPx(cls), blockPaddingPx(cls) + CONTENT_LINE_PX);

/** Pull the FIRST capture of `re` from a file's text, or throw a clear error. */
function grab(file, re, label) {
  const m = read(...file.split("/")).match(re);
  assert.ok(
    m && m[1] != null,
    `${label}: could not locate its class string in ${file}`,
  );
  return m[1];
}

/** All `<a … class="…">` class strings in a file (multi-line tolerant). */
function anchorClasses(file) {
  const text = read(...file.split("/"));
  return [...text.matchAll(/<a\b[^>]*?\bclass="([^"]*)"/g)].map((m) => m[1]);
}

const CONTROLS = [
  {
    name: "LanguageToggle pill",
    cls: () =>
      grab(
        "src/components/LanguageToggle.astro",
        /<a\b[\s\S]*?\bclass="([^"]*)"/,
        "LanguageToggle",
      ),
  },
  {
    name: "Button skin (BASE — covers DownloadButton/Hero/DownloadCTA)",
    cls: () =>
      grab(
        "src/components/Button.astro",
        /\bBASE\s*=\s*"([^"]*)"/,
        "Button BASE",
      ),
  },
  {
    name: "FAQ <summary>",
    cls: () =>
      grab(
        "src/components/sections/FAQ.astro",
        /<summary\b[^>]*?\bclass="([^"]*)"/,
        "FAQ summary",
      ),
  },
  {
    name: "Contact channel chip",
    cls: () =>
      grab(
        "src/components/sections/Contact.astro",
        /chipClass\s*=\s*"([^"]*)"/,
        "Contact chipClass",
      ),
  },
  {
    name: "Motion toggle button (Header)",
    cls: () =>
      grab(
        "src/components/Header.astro",
        /<button\b[\s\S]*?\bclass="([^"]*)"/,
        "Header motion toggle",
      ),
  },
];

for (const control of CONTROLS) {
  test(`T1 ${control.name} has a ≥44px block target (WCAG 2.5.8)`, () => {
    const cls = control.cls();
    const px = minBlockPx(cls);
    assert.ok(
      px >= MIN_TARGET_PX,
      `${control.name}: min block size ≈ ${px}px < ${MIN_TARGET_PX}px (add min-h-11 or more block padding)\n  class="${cls}"`,
    );
  });
}

test("T1 every Footer <a> (legal + mailto) is a ≥44px block target (WCAG 2.5.8)", () => {
  const classes = anchorClasses("src/components/Footer.astro");
  assert.ok(
    classes.length >= 2,
    `expected Footer legal + mailto anchors, found ${classes.length}`,
  );
  const thin = classes.filter((c) => minBlockPx(c) < MIN_TARGET_PX);
  assert.deepEqual(
    thin.map((c) => `≈${minBlockPx(c)}px: ${c}`),
    [],
    `Footer standalone link(s) below ${MIN_TARGET_PX}px (give them min-h-11 + a flex/inline-flex block, not just an underline)`,
  );
});

// ── T2: focus-not-obscured under the sticky Header ────────────────────────────
test("T2 in-page anchor targets under the sticky Header carry scroll-margin-block-start (WCAG 2.4.11)", () => {
  const css = stripComments(read("src", "styles", "global.css"));
  assert.match(
    css,
    /scroll-margin-block-start\s*:/,
    "global.css must declare scroll-margin-block-start so anchored/focused targets clear the sticky Header",
  );
  // The three real in-page scroll destinations under the sticky bar must be covered.
  const ANCHORS = ["#main", "#what-is-nabta", "#contact"];
  // Find the rule(s) that declare scroll-margin-block-start and gather their selectors.
  const covered = new Set();
  for (const m of css.matchAll(
    /([^{}]+)\{([^{}]*scroll-margin-block-start[^{}]*)\}/g,
  )) {
    const selector = m[1];
    for (const a of ANCHORS) if (selector.includes(a)) covered.add(a);
  }
  const missing = ANCHORS.filter((a) => !covered.has(a));
  assert.deepEqual(
    missing,
    [],
    `these sticky-header anchor targets lack scroll-margin-block-start: ${missing.join(", ")}`,
  );
});

test("T2 the Header is actually sticky (the premise of the scroll-margin offset)", () => {
  const header = read("src", "components", "Header.astro");
  assert.match(
    header,
    /\bsticky\b/,
    "Header must be sticky for the scroll-margin offset to matter",
  );
});

// ── T3: focus-visible never suppressed ────────────────────────────────────────
test("T3 no interactive element strips the focus outline without a replacement ring", () => {
  const offenders = [];
  for (const file of walk(SRC, [".astro", ".css"])) {
    const rel = relative(ROOT, file);
    const text = stripComments(readFileSync(file, "utf8"));
    // Tailwind escape hatches.
    for (const m of text.matchAll(
      /(?<![\w-])(outline-none|outline-0)(?![\w-])/g,
    ))
      offenders.push(`${rel}: ${m[1]}`);
    // Raw CSS suppression.
    for (const m of text.matchAll(/outline(?:-style)?\s*:\s*(none|0)\b/g))
      offenders.push(`${rel}: outline:${m[1]}`);
  }
  assert.deepEqual(
    offenders,
    [],
    `focus outline suppressed without a replacement ring (the site owns focus via the global :focus-visible outline — never strip it):\n${offenders.join("\n")}`,
  );
});
