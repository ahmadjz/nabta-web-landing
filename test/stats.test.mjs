// Impact-stats contract (LPV2-05 RED → GREEN). The net-new Stats band finally
// wires the dormant count-up.ts, so it carries three load-bearing invariants:
//
//   1. Numbers-out-of-dict parity — the display numbers live in a NON-translated
//      tuple `STATS` (mirrors feature-icons.ts), so `STATS.length` must equal
//      `marketing.stats.items.length` in BOTH locales (a label can never desync
//      from its number on one side). marketing.test already deep-compares the
//      dict key-paths; this pins the tuple↔dict length coupling.
//   2. count-up sanity — every `countTo` is a finite POSITIVE number (never 0),
//      because the server-rendered value IS the accessible real fact.
//   3. count-up server-rendered HONESTY (dist scan) — each `[data-count-up]` node
//      in the built HTML renders the REAL fact (`${countTo}${suffix}`) as its
//      server text, NEVER "0". No-JS / crawler / Lighthouse / the runtime
//      `.sr-only` snapshot (count-up.ts arm()) all read this true number; the
//      animated 0→N span is a fresh aria-hidden sibling injected on top at runtime.
//
// Imports the `.ts` sources directly (Node 24 strips types natively). The dist
// assertions run AFTER `npm run build` (CI orders build → test), matching the
// pure-file style of marketing/cls-img-dims dist checks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { ar } from "../src/i18n/ar.ts";
import { en } from "../src/i18n/en.ts";
import { STATS } from "../src/components/sections/stats.ts";
import { FEATURE_ICONS } from "../src/components/sections/feature-icons.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const HOME_PAGES = ["index.html", join("en", "index.html")];

test("STATS tuple length matches marketing.stats.items in BOTH locales", () => {
  assert.equal(
    STATS.length,
    ar.marketing.stats.items.length,
    `STATS (${STATS.length}) != ar stats.items (${ar.marketing.stats.items.length})`,
  );
  assert.equal(
    STATS.length,
    en.marketing.stats.items.length,
    `STATS (${STATS.length}) != en stats.items (${en.marketing.stats.items.length})`,
  );
  assert.ok(STATS.length > 0, "STATS must not be empty");
});

test("every stat countTo is a finite positive number (never 0) + string suffix", () => {
  for (const [i, s] of STATS.entries()) {
    assert.ok(
      Number.isFinite(s.countTo) && s.countTo > 0,
      `STATS[${i}].countTo must be a finite positive number, got ${s.countTo}`,
    );
    assert.equal(
      typeof s.suffix,
      "string",
      `STATS[${i}].suffix must be a string`,
    );
  }
});

test("stats.items labels are non-blank in both locales", () => {
  for (const [loc, items] of [
    ["ar", ar.marketing.stats.items],
    ["en", en.marketing.stats.items],
  ]) {
    items.forEach((item, i) => {
      assert.ok(
        typeof item.label === "string" && item.label.trim().length > 0,
        `${loc}.marketing.stats.items[${i}].label is blank`,
      );
    });
  }
});

// Honesty coupling: the "product breadth" stat (STATS[0]) states the app's real
// feature count, so it can never drift from the Features bento (FEATURE_ICONS is
// length-pinned to features.items by features.test). If a copy pass changes the
// feature set, this forces the stat to be reconciled instead of silently lying.
test("STATS[0] (feature count) equals the real number of features", () => {
  assert.equal(
    STATS[0].countTo,
    FEATURE_ICONS.length,
    `STATS[0].countTo (${STATS[0].countTo}) must equal the real feature count (${FEATURE_ICONS.length})`,
  );
});

test("dist home pages exist (build ran first)", () => {
  for (const page of HOME_PAGES) {
    assert.ok(
      existsSync(join(DIST, page)),
      `dist/${page} missing — run \`npm run build\` before the tests`,
    );
  }
});

/** Pull every `[data-count-up]` element out of built HTML as
 *  { to: "<data-count-to>", suffix: "<data-count-suffix|''>", text: "<inner>" }. */
function countUpNodes(html) {
  const nodes = [];
  for (const tag of html.match(
    /<[a-z]+\b[^>]*\bdata-count-up\b[^>]*>[^<]*<\/[a-z]+>/gi,
  ) ?? []) {
    const to = tag.match(/data-count-to="([^"]*)"/i)?.[1] ?? null;
    const suffix = tag.match(/data-count-suffix="([^"]*)"/i)?.[1] ?? "";
    const text = tag
      .replace(/^<[^>]*>/, "")
      .replace(/<\/[a-z]+>$/i, "")
      .trim();
    nodes.push({ to, suffix, text });
  }
  return nodes;
}

test("count-up nodes render the REAL fact server-side (never 0), one per stat", () => {
  for (const page of HOME_PAGES) {
    const html = readFileSync(join(DIST, page), "utf8");
    const nodes = countUpNodes(html);
    assert.ok(
      nodes.length >= STATS.length,
      `${page}: expected ≥${STATS.length} [data-count-up] nodes, found ${nodes.length}`,
    );
    // No count-up node may ship "0" as its server text — that would hand the
    // real value to nobody until JS runs (a no-JS / crawler honesty regression).
    for (const n of nodes) {
      assert.ok(
        n.text !== "0" && n.text !== "",
        `${page}: a [data-count-up] node server-renders "${n.text}" (must be the real fact, never 0/empty)`,
      );
    }
    // Every STATS entry must have a matching node whose data-count-to is finite
    // and whose server text is exactly the real fact `${countTo}${suffix}`.
    for (const [i, s] of STATS.entries()) {
      const expected = `${s.countTo}${s.suffix}`;
      const match = nodes.find(
        (n) => Number(n.to) === s.countTo && n.text === expected,
      );
      assert.ok(
        match,
        `${page}: no [data-count-up] node for STATS[${i}] (data-count-to="${s.countTo}", text "${expected}")`,
      );
      assert.ok(
        Number.isFinite(Number(match.to)),
        `${page}: STATS[${i}] data-count-to="${match.to}" is not finite`,
      );
    }
  }
});
