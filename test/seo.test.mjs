// SEO finalize test (SITE-04 RED → GREEN). Asserts the emitted `dist/` carries
// complete, correct per-page SEO metadata: a non-empty title + meta description,
// an absolute base-prefixed self-canonical, RECIPROCAL hreflang (ar + en +
// x-default→ar) generated from the one page-pair map, JSON-LD Organization +
// MobileApplication, and the favicon/app-icon links. The 404 page (no pair) emits
// NO hreflang and is noindex.
//
// Pure file assertions over `dist/` — run AFTER `npm run build` (CI orders
// build → test). Imports the page-pair map directly (Node 24 strips TS natively).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_PAIRS } from "../src/i18n/page-pairs.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const SITE = "https://ahmadjz.github.io";
const BASE = "/nabta-web-landing/";

/** Map an un-based page path to its built file, dir- or flat-format. */
function readBuilt(unbasedPath) {
  const clean = unbasedPath.replace(/^\//, "").replace(/\/$/, "");
  const candidates = clean
    ? [join(clean, "index.html"), `${clean}.html`]
    : ["index.html"];
  for (const c of candidates) {
    const file = join(DIST, c);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  return null;
}

/** absoluteUrl() equivalent for the test (must match src/lib/base.ts output). */
function abs(unbasedPath) {
  const rel = unbasedPath === "/" ? "" : unbasedPath.replace(/^\//, "");
  return `${SITE}${BASE}${rel}`;
}

function alternates(html) {
  const out = {};
  for (const m of html.matchAll(
    /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g,
  )) {
    out[m[1]] = m[2];
  }
  return out;
}

function metaContent(html, key, attr = "name") {
  const m = html.match(
    new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`),
  );
  return m ? m[1] : null;
}

const PAIRS = PAGE_PAIRS;

test("every page has a non-empty <title> and meta description", () => {
  for (const pair of PAIRS) {
    for (const loc of ["ar", "en"]) {
      const html = readBuilt(pair[loc]);
      assert.ok(html, `built page for ${pair.key} (${loc}) missing`);
      const title = html.match(/<title>([^<]*)<\/title>/);
      assert.ok(
        title && title[1].trim().length > 0,
        `${pair.key}/${loc}: empty <title>`,
      );
      const desc = metaContent(html, "description");
      assert.ok(
        desc && desc.trim().length > 0,
        `${pair.key}/${loc}: empty meta description`,
      );
    }
  }
});

test("canonical is absolute, base-prefixed, and self-referencing", () => {
  for (const pair of PAIRS) {
    for (const loc of ["ar", "en"]) {
      const html = readBuilt(pair[loc]);
      const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
      assert.ok(m, `${pair.key}/${loc}: no canonical`);
      assert.equal(
        m[1],
        abs(pair[loc]),
        `${pair.key}/${loc}: canonical is not the self URL`,
      );
    }
  }
});

test("hreflang is reciprocal: ar + en + x-default→ar, absolute, from the pair map", () => {
  for (const pair of PAIRS) {
    const expected = {
      ar: abs(pair.ar),
      en: abs(pair.en),
      "x-default": abs(pair.ar),
    };
    for (const loc of ["ar", "en"]) {
      const html = readBuilt(pair[loc]);
      const alts = alternates(html);
      assert.deepEqual(
        alts,
        expected,
        `${pair.key}/${loc}: hreflang set is not the reciprocal {ar,en,x-default→ar}`,
      );
      // self-referencing: the page's own canonical is one of its alternates.
      assert.ok(
        Object.values(alts).includes(abs(pair[loc])),
        `${pair.key}/${loc}: hreflang set does not include the page itself (not self-referencing)`,
      );
    }
  }
});

test("paired pages reference each other identically (no dangling alternate)", () => {
  for (const pair of PAIRS) {
    const arAlts = alternates(readBuilt(pair.ar));
    const enAlts = alternates(readBuilt(pair.en));
    assert.deepEqual(
      arAlts,
      enAlts,
      `${pair.key}: ar and en pages expose different alternate sets`,
    );
  }
});

test("404 has no hreflang and is noindex (no pair)", () => {
  const html = readBuilt("/404");
  assert.ok(html, "dist/404.html missing");
  assert.equal(
    Object.keys(alternates(html)).length,
    0,
    "404 must emit NO hreflang alternates (it has no page pair)",
  );
  assert.match(
    html,
    /<meta name="robots" content="noindex"/,
    "404 must be noindex",
  );
});

test("JSON-LD emits Organization + MobileApplication, all valid JSON", () => {
  for (const loc of ["ar", "en"]) {
    const html = readBuilt(loc === "ar" ? "/" : "/en/");
    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => JSON.parse(m[1]));
    assert.ok(blocks.length > 0, `${loc}: no JSON-LD block`);
    const types = blocks.flatMap((b) =>
      (b["@graph"] ?? [b]).map((n) => n["@type"]),
    );
    assert.ok(
      types.includes("Organization"),
      `${loc}: JSON-LD missing Organization`,
    );
    assert.ok(
      types.includes("MobileApplication"),
      `${loc}: JSON-LD missing MobileApplication`,
    );
    // Never a dead store link while PLAY_STORE_URL is empty (mirrors the CTA).
    const app = blocks
      .flatMap((b) => b["@graph"] ?? [b])
      .find((n) => n["@type"] === "MobileApplication");
    if ("installUrl" in app) {
      assert.notEqual(
        app.installUrl.trim(),
        "",
        `${loc}: MobileApplication.installUrl is present but empty`,
      );
    }
    const org = blocks
      .flatMap((b) => b["@graph"] ?? [b])
      .find((n) => n["@type"] === "Organization");
    assert.ok(
      typeof org.url === "string" && org.url.startsWith(`${SITE}${BASE}`),
      `${loc}: Organization.url is not absolute + base-prefixed`,
    );
  }
});

test("favicon + app-icon links are present and base-prefixed", () => {
  const html = readBuilt("/");
  const links = tagAttrs(html, "link");
  const rels = links.map((l) => (l.rel ?? "").toLowerCase());
  for (const rel of ["icon", "apple-touch-icon", "manifest"]) {
    assert.ok(rels.includes(rel), `home: missing <link rel="${rel}">`);
  }
  for (const l of links) {
    if (
      l.href &&
      l.href.startsWith("/") &&
      !l.href.startsWith(BASE) &&
      /icon|manifest/.test((l.rel ?? "").toLowerCase())
    ) {
      assert.fail(`icon/manifest link not base-prefixed: ${l.href}`);
    }
  }
  assert.ok(
    metaContent(html, "theme-color"),
    "home: missing <meta name=theme-color>",
  );
});

function tagAttrs(html, tagName) {
  return (html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? []).map(
    (tag) => {
      const out = {};
      for (const m of tag.matchAll(/(\w[\w-]*)="([^"]*)"/g)) out[m[1]] = m[2];
      return out;
    },
  );
}
