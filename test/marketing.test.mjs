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
