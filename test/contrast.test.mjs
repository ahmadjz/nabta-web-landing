// WCAG contrast gate for the botanical palette (LPV2-TASK-01). A pure source-scan
// of src/styles/global.css: it parses every `--color-*: oklch(L C H)` token from
// the @theme block and computes the WCAG contrast ratio of the AS-RENDERED
// foreground/background pairs, so a palette re-tune can never silently drop a text
// pair below AA. Lighthouse a11y=100 is the binding authority (lighthouserc.json);
// this test is its fast, local, deterministic mirror — if the two disagree the
// conversion here is wrong (fix the math, never bend Lighthouse).
//
// CORRECTNESS: the OKLCH `L` channel is PERCEPTUAL lightness, NOT WCAG relative
// luminance — using it as luminance is the classic mistake (it makes a saturated
// clay read as "light" and falsely pass). The correct path is
// OKLCH → OKLab → linear sRGB (Björn-Ottosson) → WCAG relative luminance
// (0.2126R + 0.7152G + 0.0722B on the LINEAR channels) → (L1+0.05)/(L2+0.05).
// The `does not use L-as-luminance` test below pins that distinction.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS = readFileSync(join(ROOT, "src", "styles", "global.css"), "utf8");

// ── Parse `--color-<name>: oklch(L C H)` tokens from the @theme block ──
// Only `--color-*` custom properties are considered (the `--shadow-*` tokens also
// hold oklch() but carry a `/ alpha` and a different prefix, so they never match).
// The closing `\s*\)` accepts exactly three space-separated components — a
// hypothetical alpha-carrying `--color-*: oklch(L C H / a)` would be silently
// dropped rather than mis-parsed, which is safe here (no color token uses alpha).
// Every pair below resolves its tokens through oklch(), which throws on a missing
// name, so a dropped/renamed token surfaces as a hard failure, not a false pass.
function parseColorTokens(css) {
  const re =
    /--color-([a-z0-9-]+)\s*:\s*oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/gi;
  const tokens = new Map();
  for (const m of css.matchAll(re)) {
    tokens.set(m[1], { L: +m[2], C: +m[3], H: +m[4] });
  }
  return tokens;
}
const TOKENS = parseColorTokens(CSS);

function oklch(name) {
  const t = TOKENS.get(name);
  assert.ok(t, `--color-${name} not found in global.css @theme`);
  return t;
}

// ── OKLCH → OKLab → linear sRGB (Björn-Ottosson) ──
function oklchToLinearSrgb({ L, C, H }) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

// ── linear sRGB → WCAG relative luminance ──
// Björn-Ottosson emits LINEAR-light channels, so the WCAG luminance weights apply
// directly — no extra gamma round-trip. Channels are clamped to [0,1] (a slightly
// out-of-gamut OKLCH can produce a tiny negative that would skew luminance).
function relativeLuminance(color) {
  const { r, g, b } = oklchToLinearSrgb(color);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

// ── WCAG contrast ratio between two token names ──
function contrast(fgName, bgName) {
  const l1 = relativeLuminance(oklch(fgName));
  const l2 = relativeLuminance(oklch(bgName));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5; // WCAG AA, normal text (every pair this gate checks is normal-size)

function assertRatio(fg, bg, min, note) {
  const r = contrast(fg, bg);
  assert.ok(
    r >= min,
    `${note}: ${fg} on ${bg} = ${r.toFixed(2)}:1, below the ${min}:1 floor`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion correctness — proves the math before it guards the palette.
// ─────────────────────────────────────────────────────────────────────────────
test("conversion: pure black on pure white is the definitional 21:1", () => {
  const black = relativeLuminance({ L: 0, C: 0, H: 0 });
  const white = relativeLuminance({ L: 1, C: 0, H: 0 });
  const ratio = (white + 0.05) / (black + 0.05);
  assert.ok(
    Math.abs(ratio - 21) < 0.1,
    `black↔white should be ~21:1, got ${ratio.toFixed(3)}`,
  );
});

test("conversion: does NOT use the OKLCH L channel as luminance", () => {
  // clay-700 is the sharpest discriminator: its OKLCH L (~0.51) is far higher than
  // its true WCAG luminance (~0.13, orange carries little luminance). If L were
  // (wrongly) treated as luminance, clay-700-on-cream would read ~1.8:1 and FAIL;
  // the correct calc yields ≥5:1 and PASSES. The gap proves the conversion is real.
  const clay = oklch("clay-700");
  const cream = oklch("cream");
  const lAsLuminance =
    (Math.max(cream.L, clay.L) + 0.05) / (Math.min(cream.L, clay.L) + 0.05);
  const real = contrast("clay-700", "cream");
  assert.ok(
    lAsLuminance < 2.5,
    `sanity: L-as-luminance clay-700↔cream should be tiny, got ${lAsLuminance.toFixed(2)}`,
  );
  assert.ok(
    real >= AA_NORMAL,
    `real clay-700↔cream must pass AA, got ${real.toFixed(2)}`,
  );
});

test("conversion: nominal `clay` on cream FAILS AA (why the eyebrow uses clay-700)", () => {
  // Documents the decision encoded in Eyebrow.astro: the eyebrow renders
  // `text-clay-700`, NOT nominal `clay`. Nominal clay is a decorative accent (~2.9:1
  // on cream) and must never be used for small body/eyebrow text.
  const r = contrast("clay", "cream");
  assert.ok(
    r < AA_NORMAL,
    `nominal clay on cream is a decorative accent and should NOT pass AA, got ${r.toFixed(2)}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED constraints — the two the re-tune must never break (task DoD).
// ─────────────────────────────────────────────────────────────────────────────
test("LOCK: clay-700 on cream ≥ 4.5 (the real Eyebrow.astro pair)", () => {
  assertRatio("clay-700", "cream", AA_NORMAL, "LOCK eyebrow");
});

test("LOCK: cream on primary-900 ≥ 4.5 (forest DownloadCTA band — do not lighten primary-900)", () => {
  // Solid cream on primary-900 is ~13:1 — comfortable. DownloadCTA also dims the
  // lead/note via alpha (`text-cream-50/85`, `/70`); those alpha-composited pairs
  // still clear AA (~10:1 / ~7:1 over primary-900) but are not modeled here — this
  // gate checks the opaque tokens, and Lighthouse remains the authority on alpha.
  assertRatio("cream", "primary-900", AA_NORMAL, "LOCK forest band");
});

test("LOCK: white on primary ≥ 4.5 (the primary CTA button — do not lighten primary)", () => {
  // Section forest body is cream-on-primary-900 (very safe, ~12:1). The genuinely
  // tight green text pair is the `bg-primary text-white` primary Button
  // (Button.astro). `--color-surface` is pure white (oklch(1 0 0)) == text-white.
  assertRatio("surface", "primary", AA_NORMAL, "LOCK primary CTA");
});

// ─────────────────────────────────────────────────────────────────────────────
// As-rendered fg/bg pairs — must all meet AA (mirror of what Lighthouse audits).
// ─────────────────────────────────────────────────────────────────────────────
test("body text (ink) is AA on both neutral grounds (white + cream)", () => {
  assertRatio("ink", "surface", AA_NORMAL, "body/white");
  assertRatio("ink", "cream", AA_NORMAL, "body/cream");
  assertRatio("ink-700", "cream", AA_NORMAL, "muted body/cream");
  // ink-500 is real muted text on cream (Footer tagline/copyright, LegalDoc note)
  // and carries the THINNEST margin of any body pair (~4.9:1) — guard it explicitly.
  assertRatio("ink-500", "cream", AA_NORMAL, "muted-500/cream");
});

test("clay-700 accent text is AA on every ground it renders on", () => {
  assertRatio("clay-700", "surface", AA_NORMAL, "clay-700/white"); // Card/Hero eyebrows
  assertRatio("clay-700", "cream", AA_NORMAL, "clay-700/cream"); // Eyebrow (locked above)
  assertRatio("clay-700", "clay-100", AA_NORMAL, "clay-700/clay-100"); // Testimonials tint card
});

test("link + hover states are AA on light grounds", () => {
  assertRatio("primary", "surface", AA_NORMAL, "link/white"); // LegalDoc / 404 / Features
  assertRatio("primary", "cream", AA_NORMAL, "link/cream");
  assertRatio("primary-700", "surface", AA_NORMAL, "link-hover/white"); // Footer/Contact hover
  assertRatio("primary-700", "cream", AA_NORMAL, "link-hover/cream");
});

test("sage-700 secondary text is AA on light grounds", () => {
  assertRatio("sage-700", "surface", AA_NORMAL, "sage-700/white"); // Footer / LanguageToggle
  assertRatio("sage-700", "cream", AA_NORMAL, "sage-700/cream");
});

test("light-tint text on the forest band is AA", () => {
  // The forest band (Section tone="forest": bg-primary-900) renders cream body text
  // (locked above) plus the cream-50 heading/lead in DownloadCTA. Those are the only
  // real TEXT pairs on the dark ground; the sage-200/primary-300 tints only appear as
  // aria-hidden, pointer-events-none SVG motif fills (VineFlourish/LeafCluster/Frond),
  // which are decorative and WCAG-exempt — deliberately NOT asserted here.
  assertRatio("cream-50", "primary-900", AA_NORMAL, "forest heading"); // DownloadCTA h2/lead
});
