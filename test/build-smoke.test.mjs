// Build smoke test (SITE-01 RED → GREEN). Asserts the emitted `dist/` honours the
// GitHub-Pages sub-path contract: every internal URL is base-prefixed, the
// Pages-fallback + Jekyll-opt-out files exist, and robots/sitemap carry absolute,
// base-prefixed URLs. Run AFTER `npm run build` (CI orders build → test).
//
// Pure file-based assertions — no server needed. The preview-SERVED checks (which
// the later tasks extend with link-check + Lighthouse) live in
// scripts/preview-smoke.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

// The deploy contract (kept in sync with astro.config.mjs site + base).
const SITE = "https://ahmadjz.github.io";
const BASE = "/nabta-web-landing/";

function walk(dir, ext, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, ext, acc);
    else if (full.endsWith(ext)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return file.slice(DIST.length + 1);
}

test("astro build produced a dist/", () => {
  assert.ok(existsSync(DIST), "dist/ missing — run `npm run build` first");
});

test("dist/404.html exists (GitHub Pages fallback)", () => {
  assert.ok(existsSync(join(DIST, "404.html")));
});

test("dist/.nojekyll exists (keeps _astro/ from being dropped by Pages)", () => {
  assert.ok(existsSync(join(DIST, ".nojekyll")));
});

test("ar + en home routes were emitted", () => {
  assert.ok(
    existsSync(join(DIST, "index.html")),
    "dist/index.html (ar) missing",
  );
  assert.ok(
    existsSync(join(DIST, "en", "index.html")),
    "dist/en/index.html missing",
  );
});

test("every internal href/src is base-prefixed (no bare /...)", () => {
  const offenders = [];
  for (const file of walk(DIST, ".html")) {
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const url = m[1];
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("//") ||
        url.startsWith("#") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.startsWith("data:")
      ) {
        continue;
      }
      if (url.startsWith("/") && !url.startsWith(BASE)) {
        offenders.push(`${rel(file)} → ${url}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `bare (non-base-prefixed) internal URLs:\n${offenders.join("\n")}`,
  );
});

test("absolute self-URLs (canonical/og/hreflang) keep the base prefix", () => {
  const offenders = [];
  const siteRe = new RegExp(`${SITE.replace(/\./g, "\\.")}([^"'\\s<>]*)`, "g");
  for (const file of walk(DIST, ".html")) {
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(siteRe)) {
      const path = m[1];
      if (!path.startsWith(BASE))
        offenders.push(`${rel(file)} → ${SITE}${path}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `absolute site URLs missing the base prefix:\n${offenders.join("\n")}`,
  );
});

test("robots.txt carries an absolute, base-prefixed Sitemap directive", () => {
  const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
  assert.match(
    robots,
    new RegExp(
      `Sitemap:\\s*${SITE.replace(/\./g, "\\.")}${BASE.replace(/\//g, "\\/")}sitemap-index\\.xml`,
    ),
    `robots.txt Sitemap not absolute+base-prefixed:\n${robots}`,
  );
});

test("sitemap <loc> URLs are absolute + base-prefixed", () => {
  const sitemap = join(DIST, "sitemap-0.xml");
  assert.ok(existsSync(sitemap), "dist/sitemap-0.xml missing");
  const xml = readFileSync(sitemap, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0, "no <loc> entries in sitemap-0.xml");
  for (const loc of locs) {
    assert.ok(
      loc.startsWith(`${SITE}${BASE}`),
      `sitemap loc not base-prefixed: ${loc}`,
    );
  }
});

test("no Google-Fonts / analytics third-party requests shipped", () => {
  const banned = [
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "googletagmanager.com",
    "google-analytics.com",
    "gtag(",
  ];
  const offenders = [];
  for (const file of walk(DIST, ".html")) {
    const html = readFileSync(file, "utf8");
    for (const needle of banned) {
      if (html.includes(needle)) offenders.push(`${rel(file)} → ${needle}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `third-party request(s) found:\n${offenders.join("\n")}`,
  );
});
