// Marketing-landing test (SITE-02 RED → GREEN). Three concerns the section
// components must satisfy:
//   1. Both home routes are emitted (ar `/` + en `/en/`).
//   2. STRICT ar/en marketing content-key parity — every key path (including
//      array lengths + nested keys inside list items) matches. The TS `: Dict`
//      typing already gates the top-level shape, but structural typing does NOT
//      catch array-length drift or a renamed key inside a list item, so this
//      runtime deep-compare is the real parity gate for marketing copy.
//   3. The download CTA renders DISABLED ("coming soon") while `PLAY_STORE_URL`
//      is empty — never a dead store href — and the placeholder OG image
//      resolves as an absolute, base-prefixed URL that exists in `dist/`.
//
// Imports the `.ts` dicts directly (Node 24 strips types natively). The dist
// assertions run AFTER `npm run build` (CI orders build → test), matching the
// pure-file style of build-smoke.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { ar } from "../src/i18n/ar.ts";
import { en } from "../src/i18n/en.ts";
import { PLAY_STORE_URL } from "../src/config.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

// The deploy contract (kept in sync with astro.config.mjs site + base).
const SITE = "https://ahmadjz.github.io";
const BASE = "/nabta-web-landing/";
const OG_PATH = "og-image.png";

/** Collect every leaf-and-branch key path so two dicts can be set-compared.
 *  Arrays contribute indexed paths, so a length difference fails parity. */
function keyPaths(value, prefix = "", acc = []) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => keyPaths(item, `${prefix}[${i}]`, acc));
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      keyPaths(value[key], prefix ? `${prefix}.${key}` : key, acc);
    }
  } else {
    acc.push(prefix);
  }
  return acc;
}

test("dict exposes a marketing section in both locales", () => {
  assert.ok(ar.marketing, "ar.ts is missing the `marketing` key");
  assert.ok(en.marketing, "en.ts is missing the `marketing` key");
});

test("ar/en marketing content-key parity (strict — incl. array lengths)", () => {
  const arPaths = keyPaths(ar.marketing).sort();
  const enPaths = keyPaths(en.marketing).sort();
  const onlyAr = arPaths.filter((p) => !enPaths.includes(p));
  const onlyEn = enPaths.filter((p) => !arPaths.includes(p));
  assert.deepEqual(
    { onlyAr, onlyEn },
    { onlyAr: [], onlyEn: [] },
    `marketing key-path mismatch:\n  ar-only: ${onlyAr.join(", ") || "—"}\n  en-only: ${onlyEn.join(", ") || "—"}`,
  );
});

test("no marketing string is left blank in either locale", () => {
  const blanks = [];
  for (const [loc, dict] of [
    ["ar", ar.marketing],
    ["en", en.marketing],
  ]) {
    const walk = (v, p = "") => {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (v && typeof v === "object")
        for (const k of Object.keys(v)) walk(v[k], p ? `${p}.${k}` : k);
      else if (typeof v === "string" && v.trim() === "")
        blanks.push(`${loc}.${p}`);
    };
    walk(dict);
  }
  assert.deepEqual(
    blanks,
    [],
    `blank marketing strings:\n${blanks.join("\n")}`,
  );
});

test("disabled download CTA: accessible name contains the visible label (WCAG 2.5.3, both locales)", () => {
  // The disabled "coming soon" CTA renders its VISIBLE text as `cta.label` + the
  // `cta.comingSoon` badge, while its accessible name is `cta.ariaComingSoon`.
  // WCAG 2.5.3 (Label in Name) requires the accessible name to CONTAIN the visible
  // label as a contiguous substring — Lighthouse flags a mismatch as
  // `label-content-name-mismatch`. An em-dash between the two, or a different verb
  // (ar `تحميل` vs the visible `حمّل`), breaks the substring. The axe rule doesn't
  // fire under RTL, so this test — not Lighthouse — keeps the ar dict correct too.
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  for (const [loc, cta] of [
    ["ar", ar.marketing.cta],
    ["en", en.marketing.cta],
  ]) {
    const visible = norm(`${cta.label} ${cta.comingSoon}`);
    const accessible = norm(cta.ariaComingSoon);
    assert.ok(
      accessible.includes(visible),
      `${loc}: aria "${cta.ariaComingSoon}" must contain the visible label "${cta.label} ${cta.comingSoon}" as a contiguous substring (WCAG 2.5.3 Label in Name)`,
    );
  }
});

test("disabled download CTA: RENDERED visible text stays inside the accessible name (WCAG 2.5.3, both dist homes)", () => {
  // The dict test above is necessary but not sufficient: axe compares the RENDERED
  // DOM. Astro trims the whitespace-only node between `{t.label}` and the badge
  // <span>, so without an explicit separator the built markup concatenates them
  // ("…appComing soon") and the visible text is NO LONGER a substring of the
  // accessible name — Lighthouse's `label-content-name-mismatch` fires (weight-0,
  // so a11y stays 100 and CI's gated Lighthouse can't catch it — this test does).
  // Faithfully mirror axe: strip tags to "" (axe joins text nodes with no
  // separator), strip punctuation, collapse whitespace, lowercase, then require
  // containment. Runs on `dist` AFTER build (CI orders build → test).
  const curate = (s) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ") // axe removes punctuation from BOTH sides
      .replace(/\s+/g, " ")
      .trim();
  for (const [page, cta] of [
    ["index.html", ar.marketing.cta],
    [join("en", "index.html"), en.marketing.cta],
  ]) {
    const html = readFileSync(join(DIST, page), "utf8");
    const el = html.match(
      /<span[^>]*data-download-cta[^>]*>[\s\S]*?<\/span>\s*<\/span>/,
    );
    assert.ok(el, `${page}: disabled download CTA element not found in dist`);
    // Tags → "" (NOT a space): axe concatenates inline text nodes with no
    // separator, so this reproduces the run-together gotcha faithfully.
    const visible = curate(el[0].replace(/<[^>]+>/g, ""));
    const accessible = curate(cta.ariaComingSoon);
    assert.ok(
      accessible.includes(visible),
      `${page}: rendered visible text "${visible}" is not contained in the accessible name "${accessible}" — add a separator between the label and the badge (WCAG 2.5.3)`,
    );
  }
});

test("build emitted ar `/` and en `/en/` home routes", () => {
  assert.ok(
    existsSync(join(DIST, "index.html")),
    "dist/index.html (ar) missing",
  );
  assert.ok(
    existsSync(join(DIST, "en", "index.html")),
    "dist/en/index.html missing",
  );
});

test("download CTA renders disabled while PLAY_STORE_URL is empty", () => {
  // Guard the premise: this contract is meaningful only with an empty constant.
  assert.equal(
    PLAY_STORE_URL,
    "",
    "PLAY_STORE_URL is set — flip this test when the app goes live",
  );
  for (const page of ["index.html", join("en", "index.html")]) {
    const html = readFileSync(join(DIST, page), "utf8");
    assert.match(
      html,
      /data-download-cta[^>]*data-state="disabled"/,
      `${page}: expected a disabled download CTA (data-state="disabled")`,
    );
    assert.ok(
      !/href="https?:\/\/play\.google\.com/.test(html),
      `${page}: a dead Play Store href leaked while PLAY_STORE_URL is empty`,
    );
  }
});

test("placeholder OG image is absolute, base-prefixed, and exists in dist", () => {
  const expected = `${SITE}${BASE}${OG_PATH}`;
  for (const page of ["index.html", join("en", "index.html")]) {
    const html = readFileSync(join(DIST, page), "utf8");
    assert.ok(
      html.includes(`property="og:image" content="${expected}"`),
      `${page}: og:image is not the absolute base-prefixed ${expected}`,
    );
  }
  assert.ok(
    existsSync(join(DIST, OG_PATH)),
    `dist/${OG_PATH} (1200×630 placeholder) missing`,
  );
});
