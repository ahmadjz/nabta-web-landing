// Legal-pages test (SITE-03 RED → GREEN). The legal pages are PLACEHOLDERS —
// structurally complete but draft-flagged, non-indexed, and kept out of the
// sitemap so Google never indexes placeholder text and the Play-Store submission
// of the privacy URL is gated on the DRAFT banner's removal. Anchors on:
//   - the four stable contract URLs build + render (/privacy, /terms × ar/en),
//   - the DRAFT banner + `noindex` meta + sitemap-exclusion (all driven by the one
//     `LEGAL_IS_DRAFT` flag),
//   - STRUCTURE-ONLY parity: ar/en expose the same legal section-heading KEYS
//     (deep key-path compare, NOT a body-string count — binding body text may land
//     asymmetrically once legal counsel supplies it).
//
// Imports the `.ts` config/dicts directly (Node 24 native type-stripping). Dist
// assertions run AFTER `npm run build`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { ar } from "../src/i18n/ar.ts";
import { en } from "../src/i18n/en.ts";
import { LEGAL_IS_DRAFT } from "../src/config/legal.ts";
import { CONTACT_EMAIL } from "../src/config.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const BASE = "/nabta-web-landing/";

// The four stable contract routes (un-based, as built directories).
const LEGAL_ROUTES = ["privacy", "en/privacy", "terms", "en/terms"];

/** Read a built page whether Astro emits directory- or flat-format output. */
function readPage(route) {
  for (const candidate of [join(route, "index.html"), `${route}.html`]) {
    const file = join(DIST, candidate);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  return null;
}

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

test("LEGAL_IS_DRAFT premise holds (draft-gated)", () => {
  // The draft/noindex/exclusion contract is meaningful only while this is true.
  assert.equal(
    LEGAL_IS_DRAFT,
    true,
    "LEGAL_IS_DRAFT is false — flip these assertions when legal text lands",
  );
});

test("all four legal pages build (ar + en × privacy + terms)", () => {
  for (const route of LEGAL_ROUTES) {
    assert.ok(readPage(route), `dist legal page for /${route} missing`);
  }
});

test("each legal page shows the DRAFT banner while draft", () => {
  for (const route of LEGAL_ROUTES) {
    assert.match(
      readPage(route),
      /data-draft-banner/,
      `/${route}: DRAFT banner (data-draft-banner) missing`,
    );
  }
});

test("each legal page is noindex while draft", () => {
  for (const route of LEGAL_ROUTES) {
    assert.match(
      readPage(route),
      /<meta name="robots" content="noindex"/,
      `/${route}: noindex robots meta missing`,
    );
  }
});

test("draft legal pages are excluded from the sitemap", () => {
  const xml = readFileSync(join(DIST, "sitemap-0.xml"), "utf8");
  for (const route of LEGAL_ROUTES) {
    assert.ok(
      !xml.includes(`${BASE}${route}/`),
      `sitemap must NOT list draft legal page ${BASE}${route}/`,
    );
  }
  // Sanity: the (indexable) home pages ARE present, so exclusion is targeted.
  assert.ok(
    xml.includes(`${BASE}</loc>`) || xml.includes(`${BASE}"`),
    "home loc missing from sitemap",
  );
});

test("legal structure parity — ar/en share the same section-heading keys", () => {
  const arPaths = keyPaths(ar.legal).sort();
  const enPaths = keyPaths(en.legal).sort();
  const onlyAr = arPaths.filter((p) => !enPaths.includes(p));
  const onlyEn = enPaths.filter((p) => !arPaths.includes(p));
  assert.deepEqual(
    { onlyAr, onlyEn },
    { onlyAr: [], onlyEn: [] },
    `legal key-path mismatch:\n  ar-only: ${onlyAr.join(", ") || "—"}\n  en-only: ${onlyEn.join(", ") || "—"}`,
  );
});

test("privacy page pre-structures data buckets as TODO(legal) placeholders", () => {
  for (const route of ["privacy", "en/privacy"]) {
    const html = readPage(route);
    assert.match(html, /TODO\(legal\)/, `/${route}: no TODO(legal) markers`);
    // Named third parties must be pre-listed so legal fills text, not taxonomy.
    assert.ok(
      html.includes("FCM"),
      `/${route}: FCM third-party bucket missing`,
    );
    assert.ok(
      html.includes("MinIO"),
      `/${route}: MinIO third-party bucket missing`,
    );
  }
});

test("legal contact section reuses the one contact-address constant", () => {
  for (const route of LEGAL_ROUTES) {
    assert.ok(
      readPage(route).includes(`mailto:${CONTACT_EMAIL}`),
      `/${route}: contact section is not the shared mailto:${CONTACT_EMAIL}`,
    );
  }
});
