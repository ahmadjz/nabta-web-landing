// Motion-machinery + decorative-SVG audit (LVR-TASK-02). A source-scan of the
// scripts/CSS/motif/icon primitives, plus a small built-`dist` leg that re-asserts
// the download-CTA contract survives the Button refactor. Mirrors the pure-file
// style of motion-tokens / rtl-logical (no Vitest). Concerns:
//
//   H1  reveal.ts + count-up.ts init on `astro:page-load` (re-fires after a
//       ClientRouter swap, added in LVR-03) — NOT a once-only DOMContentLoaded.
//   R3  the reveal "from" state is JS-gated (html[data-motion-ready]); global.css
//       has NO static `[data-reveal]{opacity:0}`/visibility:hidden, so no-JS
//       visitors + crawlers + Lighthouse see fully-visible content.
//   H8  every motif/icon <svg> is decorative: aria-hidden + focusable=false, no
//       role="img", no <title>, no tabindex.
//   M6  every motif/icon <svg> is intrinsic-dimensioned (viewBox or width+height);
//       AmbientBackdrop is out of flow (absolute|fixed) + pointer-events-none.
//   M2  after `npm run build`, the disabled download CTA contract still holds in
//       dist (the primitive change is where it could break) — keeps marketing.test
//       + seo.test honest at the source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

/** All `.astro` files directly in a component sub-dir. */
function astroFiles(rel) {
  const dir = join(SRC, "components", rel);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".astro"))
    .map((f) => ({
      rel: `${rel}/${f}`,
      text: readFileSync(join(dir, f), "utf8"),
    }));
}

/** Extract leaf CSS rules (selector + declaration body) — innermost blocks only,
 *  so nested @layer/@media wrappers are transparent. */
function cssRules(css) {
  const rules = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    rules.push({ selector: m[1].trim(), body: m[2] });
  }
  return rules;
}

// ── H1: ClientRouter-lifecycle-aware init ────────────────────────────────────
for (const script of ["reveal.ts", "count-up.ts"]) {
  test(`H1 ${script} inits on astro:page-load (re-fires after a ClientRouter swap)`, () => {
    const src = read("src", "scripts", script);
    assert.match(
      src,
      /document\.addEventListener\(\s*["']astro:page-load["']/,
      `${script}: must register init on document "astro:page-load"`,
    );
    assert.ok(
      !/DOMContentLoaded/.test(src),
      `${script}: must NOT gate init on a once-only DOMContentLoaded`,
    );
  });
}

// ── R3: the reveal "from" state is JS-gated, never static CSS ────────────────
test("R3 global.css has NO static [data-reveal] hidden state (JS-gated only)", () => {
  const css = read("src", "styles", "global.css");
  const ungated = [];
  let gatedFromState = false;

  for (const { selector, body } of cssRules(css)) {
    if (!selector.includes("[data-reveal")) continue;
    const hidesContent =
      /opacity\s*:\s*0(\b|;|\s)/.test(body) ||
      /visibility\s*:\s*hidden/.test(body);
    if (!hidesContent) continue;
    if (selector.includes("data-motion-ready")) gatedFromState = true;
    else ungated.push(selector);
  }

  assert.deepEqual(
    ungated,
    [],
    `static (non-JS-gated) [data-reveal] hidden state(s) found — gate behind html[data-motion-ready]:\n${ungated.join("\n")}`,
  );
  assert.ok(
    gatedFromState,
    "expected a JS-gated html[data-motion-ready] [data-reveal] from-state rule",
  );
});

// ── H8 + M6: decorative-SVG a11y + intrinsic dimensions ──────────────────────
const DECORATIVE = [...astroFiles("motifs"), ...astroFiles("icons")];

test("decorative motif/icon set is non-empty (sanity)", () => {
  assert.ok(
    DECORATIVE.length >= 10,
    `only ${DECORATIVE.length} motif/icon files`,
  );
});

for (const { rel, text } of DECORATIVE) {
  const svgOpen = text.match(/<svg\b[^>]*>/);
  // A dispatcher (Icon.astro) has no <svg> of its own — nothing to audit.
  if (!svgOpen) continue;
  const tag = svgOpen[0];

  test(`H8 ${rel} root <svg> is decorative (aria-hidden, no role/title/tabindex)`, () => {
    assert.match(
      tag,
      /aria-hidden="true"/,
      `${rel}: <svg> missing aria-hidden="true"`,
    );
    assert.match(
      tag,
      /focusable="false"/,
      `${rel}: <svg> missing focusable="false"`,
    );
    assert.ok(
      !/role="img"/.test(tag),
      `${rel}: decorative <svg> must not set role="img"`,
    );
    assert.ok(
      !/tabindex/.test(tag),
      `${rel}: decorative <svg> must not be focusable (tabindex)`,
    );
    assert.ok(
      !/<title[\s>]/.test(text),
      `${rel}: decorative <svg> must not carry a <title>`,
    );
  });

  test(`M6 ${rel} <svg> is intrinsic-dimensioned (viewBox or width+height)`, () => {
    const hasViewBox = /viewBox="/.test(tag);
    const hasWH = /\bwidth="/.test(tag) && /\bheight="/.test(tag);
    assert.ok(
      hasViewBox || hasWH,
      `${rel}: <svg> needs a viewBox or explicit width+height (no-CLS sizing)`,
    );
  });
}

// ── M6: AmbientBackdrop is out of flow + non-interactive ─────────────────────
test("M6 AmbientBackdrop is out of flow (absolute|fixed) + pointer-events-none", () => {
  const text = read("src", "components", "AmbientBackdrop.astro");
  assert.match(
    text,
    /pointer-events-none/,
    "AmbientBackdrop must be pointer-events-none",
  );
  assert.match(
    text,
    /\babsolute\b|\bfixed\b|position:\s*(absolute|fixed)/,
    "AmbientBackdrop root must be position:absolute|fixed (out of flow → no CLS)",
  );
  assert.match(
    text,
    /aria-hidden="true"/,
    "AmbientBackdrop must be aria-hidden",
  );
});

// ── M2: the disabled download-CTA contract survives the Button refactor ──────
test("M2 (dist) disabled download CTA still emitted after the Button refactor", () => {
  for (const page of ["index.html", join("en", "index.html")]) {
    const file = join(DIST, page);
    assert.ok(
      existsSync(file),
      `${page} missing — run \`npm run build\` first`,
    );
    const html = readFileSync(file, "utf8");
    assert.match(
      html,
      /data-download-cta[^>]*data-state="disabled"/,
      `${page}: refactored Button dropped the disabled download CTA contract`,
    );
    assert.match(
      html,
      /role="button"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*role="button"/,
      `${page}: disabled CTA must render <span role="button" aria-disabled="true">`,
    );
  }
});
