// Internal link-check + no-third-party NETWORK assertion (SITE-04). Boots
// `astro preview` (which honours `base` — `astro dev` serves at root and would
// pass while production 404s) and crawls the BUILT, base-served site over HTTP:
//
//   1. Every internal <a> link resolves (no broken links).
//   2. Every RESOURCE a page loads (stylesheet / script / icon / manifest /
//      preload / <img>/srcset / og:image) is SAME-ORIGIN and resolves — a
//      cross-origin resource is the no-third-party-requests failure (no
//      analytics, no Google-Fonts CDN). Data references (JSON-LD @context, a
//      future Play-Store <a>, mailto:) are NOT requests and are not gated.
//   3. Every sitemap <loc> is absolute + base-prefixed and resolves; the DRAFT
//      legal pages are EXCLUDED from the sitemap.
//
// Requires a prior `npm run build`. Exits non-zero on any failed check. This is
// the preview-served harness the scaffold (scripts/preview-smoke.mjs) promised
// SITE-04 would extend.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 4322; // distinct from preview-smoke's 4321 so the two can't collide
const BASE = "/nabta-web-landing/";
const ORIGIN = `http://${HOST}:${PORT}`;
const SITE = "https://ahmadjz.github.io";
const SITE_HOST = new URL(SITE).host;

// DRAFT legal routes (base-prefixed, directory form) that must NOT be in the
// sitemap while LEGAL_IS_DRAFT — mirrors astro.config.mjs's SITEMAP_EXCLUDE.
const DRAFT_LEGAL_LOCS = ["privacy", "en/privacy", "terms", "en/terms"].map(
  (r) => `${SITE}${BASE}${r}/`,
);

const failures = [];
const fail = (msg) => failures.push(msg);

// ── tiny HTML attribute extractors (regex, zero-dep — matches build-smoke style)
function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}
function tags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

/** Page-navigation links (<a href>) — internal ones get crawled. */
function anchorHrefs(html) {
  return tags(html, "a")
    .map((t) => attr(t, "href"))
    .filter(Boolean);
}

/** Browser-fetched RESOURCE URLs on a page (the no-3rd-party surface). */
function resourceUrls(html) {
  const urls = [];
  for (const t of tags(html, "link")) {
    const rel = (attr(t, "rel") ?? "").toLowerCase();
    if (/stylesheet|icon|apple-touch-icon|manifest|preload/.test(rel)) {
      const href = attr(t, "href");
      if (href) urls.push(href);
    }
  }
  for (const t of tags(html, "script")) {
    const src = attr(t, "src");
    if (src) urls.push(src);
  }
  for (const t of [...tags(html, "img"), ...tags(html, "source")]) {
    const src = attr(t, "src");
    if (src) urls.push(src);
    const srcset = attr(t, "srcset");
    if (srcset)
      urls.push(...srcset.split(",").map((s) => s.trim().split(/\s+/)[0]));
  }
  // og:image is a resource social scrapers fetch — it must resolve too.
  for (const t of tags(html, "meta")) {
    if ((attr(t, "property") ?? "") === "og:image") {
      const c = attr(t, "content");
      if (c) urls.push(c);
    }
  }
  return urls.filter(Boolean);
}

/** Classify a URL relative to our origin. Resolves SITE-absolute → preview. */
function classify(raw) {
  if (/^(mailto:|tel:|#|data:|javascript:)/i.test(raw)) return { kind: "skip" };
  let u;
  try {
    u = new URL(raw, ORIGIN + BASE);
  } catch {
    return { kind: "skip" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return { kind: "skip" };
  const isSameDeploy =
    u.host === `${HOST}:${PORT}` || u.host === HOST || u.host === SITE_HOST;
  // Fetch everything against the running preview, regardless of declared host.
  const fetchUrl = `${ORIGIN}${u.pathname}${u.search}`;
  return {
    kind: "url",
    sameOrigin: isSameDeploy,
    pathname: u.pathname,
    fetchUrl,
    href: u.href,
  };
}

async function waitForReady(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`preview server never came up at ${url}`);
}

const preview = spawn(
  "npm",
  ["run", "preview", "--", "--host", HOST, "--port", String(PORT)],
  { stdio: ["ignore", "ignore", "inherit"] },
);

let crashed = null;
try {
  await waitForReady(`${ORIGIN}${BASE}`);

  // ── 1. crawl internal pages, BFS from the two locale roots ────────────────
  const seenPages = new Set();
  const queue = [`${ORIGIN}${BASE}`, `${ORIGIN}${BASE}en/`];
  const resourceChecks = new Map(); // fetchUrl → {sameOrigin, where, raw}
  let crawled = 0;

  while (queue.length) {
    const pageUrl = queue.shift();
    if (seenPages.has(pageUrl)) continue;
    seenPages.add(pageUrl);

    const res = await fetch(pageUrl, { redirect: "manual" });
    if (res.status !== 200) {
      fail(`page ${pageUrl} → HTTP ${res.status}`);
      continue;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) continue;
    crawled++;
    const html = await res.text();

    // internal <a> links → verify + enqueue same-origin HTML
    for (const href of anchorHrefs(html)) {
      const c = classify(href);
      if (c.kind !== "url") continue;
      if (!c.sameOrigin) continue; // external link (e.g. future Play Store) — not a broken-internal-link concern
      const linkRes = await fetch(c.fetchUrl, { redirect: "manual" });
      if (linkRes.status >= 400)
        fail(
          `broken internal link ${href} (on ${pageUrl}) → HTTP ${linkRes.status}`,
        );
      const linkCt = linkRes.headers.get("content-type") ?? "";
      if (linkRes.status === 200 && linkCt.includes("text/html"))
        queue.push(c.fetchUrl);
    }

    // resources → collect (dedup) for the same-origin + resolves checks
    for (const raw of resourceUrls(html)) {
      const c = classify(raw);
      if (c.kind !== "url") continue;
      if (!resourceChecks.has(c.fetchUrl))
        resourceChecks.set(c.fetchUrl, {
          sameOrigin: c.sameOrigin,
          where: pageUrl,
          raw,
        });
    }
  }

  if (crawled < 2)
    fail(`crawl reached only ${crawled} page(s) (expected ar + en homes)`);

  // ── 2. resource resolution + NO-THIRD-PARTY (same-origin) assertion ───────
  for (const [fetchUrl, info] of resourceChecks) {
    if (!info.sameOrigin)
      fail(
        `THIRD-PARTY resource ${info.raw} (on ${info.where}) — the site must make zero third-party requests`,
      );
    const r = await fetch(fetchUrl, { redirect: "manual" });
    if (r.status >= 400)
      fail(
        `unresolvable resource ${info.raw} (on ${info.where}) → HTTP ${r.status}`,
      );
  }

  // ── 3. sitemap: <loc>s absolute+base-prefixed + resolve; DRAFT excluded ───
  const idx = await fetch(`${ORIGIN}${BASE}sitemap-index.xml`);
  if (idx.status !== 200) fail(`sitemap-index.xml → HTTP ${idx.status}`);
  const idxXml = await idx.text();
  const childSitemaps = [...idxXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1],
  );
  const pageLocs = [];
  for (const sm of childSitemaps) {
    if (!sm.startsWith(`${SITE}${BASE}`))
      fail(`sitemap-index <loc> not absolute+base-prefixed: ${sm}`);
    const r = await fetch(`${ORIGIN}${new URL(sm).pathname}`);
    if (r.status !== 200) fail(`child sitemap ${sm} → HTTP ${r.status}`);
    const xml = await r.text();
    pageLocs.push(
      ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
    );
  }
  if (pageLocs.length === 0) fail("no page <loc> entries found in the sitemap");
  for (const loc of pageLocs) {
    if (!loc.startsWith(`${SITE}${BASE}`))
      fail(`sitemap <loc> not absolute+base-prefixed: ${loc}`);
    const r = await fetch(`${ORIGIN}${new URL(loc).pathname}`, {
      redirect: "manual",
    });
    if (r.status >= 400)
      fail(`sitemap <loc> does not resolve: ${loc} → HTTP ${r.status}`);
  }
  for (const draft of DRAFT_LEGAL_LOCS) {
    if (pageLocs.includes(draft))
      fail(`DRAFT legal page must be excluded from the sitemap: ${draft}`);
  }
} catch (err) {
  crashed = err;
} finally {
  preview.kill("SIGTERM");
}

if (crashed) {
  console.error(`\n✗ ${crashed.message}\n`);
  process.exit(1);
}
if (failures.length) {
  console.error(`\n✗ link-check failed (${failures.length}):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(
  "✓ link-check: internal links + resources resolve, zero third-party requests, sitemap base-prefixed + DRAFT-excluded",
);
process.exit(0);
