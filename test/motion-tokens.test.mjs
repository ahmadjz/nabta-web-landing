// Design-token + motion-foundation audit (LVR-TASK-01). A pure source-scan of
// src/styles/global.css — no build needed (mirrors rtl-logical.test.mjs style).
// Proves the botanical palette, the display/Arabic-display fonts, the motion
// tokens, the global reduce-motion override, and the direction-aware --slide-from
// var are all present, so every downstream LVR task can consume them. Keeping the
// scale tokens named here is the contract LVR-02..09 build on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS = readFileSync(join(ROOT, "src", "styles", "global.css"), "utf8");

/** A custom property is *defined* when `--name` is followed (after ws) by `:`. */
function defines(name) {
  return new RegExp(`${name.replace(/[-]/g, "\\-")}\\s*:`).test(CSS);
}
function assertDefines(tokens) {
  const missing = tokens.filter((t) => !defines(t));
  assert.deepEqual(
    missing,
    [],
    `global.css is missing token(s): ${missing.join(", ")}`,
  );
}

test("keeps the snapshot brand tokens (continuity with the admin)", () => {
  assertDefines(["--color-primary", "--color-ring", "--radius", "--font-sans"]);
});

test("defines the botanical color anchors", () => {
  assertDefines([
    "--color-sage",
    "--color-cream",
    "--color-clay",
    "--color-ink",
    "--color-surface",
    "--color-line",
  ]);
});

test("defines the botanical color scale steps downstream relies on", () => {
  assertDefines([
    "--color-primary-50",
    "--color-primary-100",
    "--color-primary-600",
    "--color-primary-700",
    "--color-primary-900",
    "--color-sage-100",
    "--color-sage-200",
    "--color-sage-700",
    "--color-cream-deep",
    "--color-cream-50",
    "--color-clay-100",
    "--color-clay-200",
    "--color-clay-600",
    "--color-clay-700",
    "--color-ink-700",
    "--color-ink-500",
    "--color-ink-300",
    "--color-surface-muted",
  ]);
});

test("defines the display + Arabic-display fonts (and keeps --font-sans)", () => {
  assertDefines(["--font-display", "--font-display-ar", "--font-sans"]);
  // The Latin display face is Fraunces (variable); the Arabic display is Tajawal.
  assert.match(
    CSS,
    /--font-display\s*:[^;]*Fraunces/i,
    "--font-display must name Fraunces",
  );
  assert.match(
    CSS,
    /--font-display-ar\s*:[^;]*Tajawal/i,
    "--font-display-ar must name Tajawal",
  );
});

test("defines the type scale with paired line-heights", () => {
  assertDefines([
    "--text-display",
    "--text-h1",
    "--text-h2",
    "--text-h3",
    "--text-lead",
    "--text-body",
    "--text-small",
    "--text-eyebrow",
    "--text-display--line-height",
    "--text-h1--line-height",
    "--text-eyebrow--letter-spacing",
  ]);
  // Fluid display/h1/h2/h3/lead — at least the display size clamps.
  assert.match(
    CSS,
    /--text-display\s*:[^;]*clamp\(/,
    "--text-display must be fluid (clamp())",
  );
});

test("defines spacing, container, radius and leaf/clay shadow tokens", () => {
  assertDefines([
    "--space-section-y",
    "--space-section-y-sm",
    "--space-stack",
    "--space-gutter",
    "--container-editorial",
    "--container-prose",
    "--radius-xl",
    "--radius-2xl",
    "--radius-blob",
    "--shadow-leaf-sm",
    "--shadow-leaf",
    "--shadow-leaf-lg",
    "--shadow-clay",
  ]);
});

test("defines the motion tokens (ease / duration / stagger)", () => {
  assert.match(CSS, /--ease-[\w-]+\s*:/, "needs at least one --ease-* token");
  assert.match(CSS, /--dur-[\w-]+\s*:/, "needs at least one --dur-* token");
  assertDefines(["--stagger"]);
});

test("has a global prefers-reduced-motion override block", () => {
  assert.match(
    CSS,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    "missing the global reduce-motion @media block",
  );
});

test("sets --slide-from under BOTH [dir=ltr] and [dir=rtl] (direction-aware motion)", () => {
  assert.match(
    CSS,
    /\[dir="ltr"\]\s*\{[^}]*--slide-from\s*:/,
    "[dir=ltr] must set --slide-from",
  );
  assert.match(
    CSS,
    /\[dir="rtl"\]\s*\{[^}]*--slide-from\s*:/,
    "[dir=rtl] must set --slide-from",
  );
});

test("face-swaps .font-display to the Arabic display face at document level (html[dir=rtl])", () => {
  // Scope to html[dir=rtl], NOT any-ancestor [dir=rtl], so a local dir=ltr island
  // (e.g. an email node) can't flip Arabic headings to a Latin face.
  assert.match(
    CSS,
    /html\[dir="rtl"\]\s+\.font-display\s*\{[^}]*--font-display-ar|html\[dir="rtl"\]\s+\.font-display\s*\{[^}]*var\(--font-display-ar\)/,
    "missing html[dir=rtl] .font-display face-swap to --font-display-ar",
  );
  assert.match(
    CSS,
    /\.font-display\s*\{[^}]*var\(--font-display\)/,
    "missing base .font-display rule",
  );
});
