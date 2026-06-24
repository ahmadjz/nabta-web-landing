// Preview-SERVED smoke check (SITE-01). Boots `astro preview` (which honours
// `base`, unlike `astro dev` which serves at root and would pass while production
// 404s) and asserts the sub-path contract over HTTP. This is the harness the later
// tasks extend — SITE-02/03 add an internal link-check + Lighthouse run against the
// same running preview server.
//
// Requires a prior `npm run build`. Exits non-zero on any failed check.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 4321;
const BASE = "/nabta-web-landing/";
const ORIGIN = `http://${HOST}:${PORT}`;
const SITE = "https://ahmadjz.github.io";

const checks = [];
const record = (name, ok, detail = "") =>
  checks.push({ name, ok: !!ok, detail });

async function waitForReady(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(url);
      return; // any response means the server is listening
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

  // 1. ar home serves UNDER the base path, RTL.
  const home = await fetch(`${ORIGIN}${BASE}`);
  const homeHtml = await home.text();
  record(
    "ar home 200 under base",
    home.status === 200,
    `status ${home.status}`,
  );
  record(
    "ar home is <html lang=ar dir=rtl>",
    /<html[^>]*\blang="ar"/.test(homeHtml) &&
      /<html[^>]*\bdir="rtl"/.test(homeHtml),
  );
  record("ar home assets are base-prefixed", homeHtml.includes(`"${BASE}`));

  // 2. en home serves, LTR.
  const en = await fetch(`${ORIGIN}${BASE}en/`);
  const enHtml = await en.text();
  record("en home 200", en.status === 200, `status ${en.status}`);
  record(
    "en home is <html lang=en dir=ltr>",
    /<html[^>]*\blang="en"/.test(enHtml) &&
      /<html[^>]*\bdir="ltr"/.test(enHtml),
  );

  // 3. THE base-path proof: bare root is NOT the site (dev would serve it).
  const bare = await fetch(`${ORIGIN}/`, { redirect: "manual" });
  record(
    "bare / is not served (base enforced)",
    bare.status === 404,
    `status ${bare.status}`,
  );

  // 4. robots.txt is reachable with an absolute, base-prefixed Sitemap.
  const robots = await fetch(`${ORIGIN}${BASE}robots.txt`);
  const robotsTxt = await robots.text();
  record("robots.txt 200", robots.status === 200, `status ${robots.status}`);
  record(
    "robots Sitemap is absolute+base",
    robotsTxt.includes(`Sitemap: ${SITE}${BASE}sitemap-index.xml`),
  );
} catch (err) {
  crashed = err;
} finally {
  preview.kill("SIGTERM");
}

let failed = Boolean(crashed);
if (crashed) console.error(`\n✗ ${crashed.message}\n`);
for (const c of checks) {
  console.log(
    `${c.ok ? "✓" : "✗"} ${c.name}${c.ok || !c.detail ? "" : ` (${c.detail})`}`,
  );
  if (!c.ok) failed = true;
}

process.exit(failed ? 1 : 0);
