// RTL logical-property audit (SITE-04). The site is Arabic-default + RTL, so
// LAYOUT spacing/positioning must use Tailwind LOGICAL utilities (ps-/pe-, ms-/me-,
// start-/end-, text-start/end) and logical CSS — never physical pl-/pr-/ml-/mr-,
// left-/right-, text-left/right, which silently break the mirrored RTL layout.
// This scans the markup + CSS sources (NOT the .ts dictionaries — Arabic prose
// legitimately contains the words "right"/"left"). A match fails the build so a
// physical property can never sneak in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

function walk(dir, exts, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => full.endsWith(e))) acc.push(full);
  }
  return acc;
}

// Physical Tailwind utilities (with optional responsive/state prefixes) + raw
// physical CSS. Word-boundaried so logical siblings (pe-/ps-/me-/ms-/end-/start-,
// border-t/border-b, text-center) and unrelated tokens (border-red-…) don't match.
const BANNED = [
  {
    re: /\b[mp][lr]-\b|\b[mp][lr]-[\w[]/g,
    label: "physical margin/padding (use ps-/pe-/ms-/me-)",
  },
  {
    re: /\b(?:left|right)-(?:\d|auto|full|px|\[)/g,
    label: "physical inset (use start-/end-)",
  },
  {
    re: /\btext-(?:left|right)\b/g,
    label: "physical text-align (use text-start/text-end)",
  },
  {
    re: /\brounded-(?:tl|tr|bl|br|l|r)\b/g,
    label: "physical corner radius (use rounded-s*/rounded-e*)",
  },
  {
    re: /\bborder-(?:l|r)\b/g,
    label: "physical border side (use border-s/border-e)",
  },
  {
    re: /\bfloat-(?:left|right)\b/g,
    label: "physical float (use float-start/float-end)",
  },
  {
    re: /(?:margin|padding|border|inset)-(?:left|right)\s*:/g,
    label: "raw physical CSS (use *-inline-start/end)",
  },
  {
    re: /(?<![\w-])(?:left|right)\s*:/g,
    label: "raw physical left/right (use inset-inline-start/end)",
  },
];

test("no physical (RTL-breaking) layout properties in markup/CSS sources", () => {
  const offenders = [];
  for (const file of walk(SRC, [".astro", ".css"])) {
    const text = readFileSync(file, "utf8");
    const rel = file.slice(ROOT.length + 1);
    for (const { re, label } of BANNED) {
      for (const m of text.matchAll(re)) {
        offenders.push(`${rel}: "${m[0].trim()}" — ${label}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `physical (RTL-breaking) properties found — switch to logical utilities:\n${offenders.join("\n")}`,
  );
});
