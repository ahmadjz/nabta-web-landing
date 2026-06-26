// Preview-SERVED smoke check (SITE-01, extended in LVR-03). Boots `astro preview`
// (which honours `base`, unlike `astro dev` which serves at root and would pass
// while production 404s) and asserts the sub-path contract over HTTP. LVR-03 adds a
// HEADLESS-BROWSER leg (puppeteer-core driving the system Chrome — dev-only, no
// runtime third-party) that owns the ClientRouter risk surface: this is the FIRST
// runtime JS on a zero-JS site and the only nav that crosses locales, so its
// console/dir/focus/same-origin/reveal/reduce-motion regressions are gated RED here.
//
// Requires a prior `npm run build`. Exits non-zero on any failed check. The headless
// leg SKIPS (does not fail) when no Chrome binary is found, so the HTTP contract
// still gates in a Chrome-less CI; locally (Chrome present) the full leg runs.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

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

// ── Chrome discovery for the headless leg ────────────────────────────────────
// Drives a system Chrome via puppeteer-CORE (no bundled browser download — the
// dep stays dev-only like sharp). Honours the same env overrides the Lighthouse
// tooling uses; falls back to the common system paths.
function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Resolve true once `fn` holds in the page, false if it times out (no throw). */
async function waitOk(page, fn, timeout = 8000) {
  try {
    await page.waitForFunction(fn, { timeout });
    return true;
  } catch {
    return false;
  }
}

// ── The headless-browser leg (LVR-03) ────────────────────────────────────────
async function headlessLeg() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.warn(
      "⚠ headless leg SKIPPED: no Chrome binary found (set CHROME_PATH / PUPPETEER_EXECUTABLE_PATH). HTTP sub-path checks still ran.",
    );
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    // ── Page A: console / swaps / skip-link / same-origin / reveals ──────────
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requests = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("request", (r) => requests.push(r.url()));

    // Direct loads of BOTH locale homes (initial-load console-error capture; the
    // static Lighthouse run never triggers a swap, so this is the only thing that
    // catches a swap-time throw too — captured below across the swap sequence).
    await page.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await page.goto(`${ORIGIN}${BASE}en/`, { waitUntil: "networkidle0" });
    // Back to ar home to start the swap sequence.
    await page.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(page, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );

    const initial = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    record(
      "headless: ar home is <html lang=ar dir=rtl>",
      initial.lang === "ar" && initial.dir === "rtl",
      JSON.stringify(initial),
    );

    // ── Hero <h1> is opaque at first paint EVEN with reveals armed (R4/LCP) ───
    // data-motion-ready is set (reveal from-states are now opacity:0), yet the
    // LCP heading must read opacity:1 — it is never a [data-reveal] target, so the
    // Largest Contentful Paint never waits on JS. The static-HTML Lighthouse run
    // can't prove this (it sees the no-JS DOM); only a JS-armed page can.
    const heroArmed = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      return h1 ? getComputedStyle(h1).opacity : null;
    });
    record(
      "headless: hero <h1> opacity===1 at first paint while reveals are armed (R4/LCP)",
      heroArmed === "1",
      `opacity=${heroArmed}`,
    );

    // ── Arabic display face actually WINS the cascade (RTL face-swap) ─────────
    // build-smoke greps that `html[dir=rtl] .font-display` EXISTS in source; it
    // cannot prove the rule WINS at runtime. Tailwind v4 auto-generates a
    // `.font-display` utility from the `--font-display` token in the later
    // `utilities` layer, and CSS layer order beats the base-layer swap's higher
    // specificity — so a font-family swap authored in `@layer base` silently
    // loses and every Arabic display heading falls back to the Latin Fraunces
    // stack (no Arabic glyphs → an OS serif fallback that varies per visitor).
    // Only a live computed style on the rtl page catches it.
    const arDisplayFont = await page.evaluate(() => {
      const el = document.querySelector(".font-display");
      return el ? getComputedStyle(el).fontFamily : null;
    });
    record(
      "headless: ar .font-display resolves to the Arabic face (Tajawal), not Fraunces (RTL swap wins the layer cascade)",
      !!arDisplayFont &&
        /tajawal/i.test(arDisplayFont) &&
        !/fraunces/i.test(arDisplayFont),
      `font-family=${arDisplayFont}`,
    );

    // ── Swap forward ar→en via the toggle (no full navigation) ───────────────
    await page.click("[data-language-toggle]");
    const swappedToEn = await waitOk(
      page,
      () => document.documentElement.lang === "en",
    );
    const en = await page.evaluate(() => {
      const brand = [...document.querySelectorAll("header a")].find(
        (a) => !a.hasAttribute("data-language-toggle"),
      );
      const toggle = document.querySelector("[data-language-toggle]");
      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        brandHref: brand ? new URL(brand.href).pathname : null,
        toggleHref: toggle ? new URL(toggle.href).pathname : null,
      };
    });
    record(
      "headless: post-swap is <html lang=en dir=ltr> (C1/H6)",
      swappedToEn && en.lang === "en" && en.dir === "ltr",
      JSON.stringify(en),
    );
    record(
      "headless: post-swap header home href is /en/ (not stale)",
      en.brandHref === `${BASE}en/`,
      String(en.brandHref),
    );
    record(
      "headless: post-swap toggle targets ar home (not stale)",
      en.toggleHref === BASE,
      String(en.toggleHref),
    );

    // ── Reveals re-fire after the swap (H1) ──────────────────────────────────
    // data-motion-ready is re-set by reveal.ts's astro:page-load init (the new
    // page's <html> arrives WITHOUT it), proving the re-init ran; then the footer
    // [data-reveal], scrolled into view, gains .is-revealed.
    const reArmed = await waitOk(page, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const revealed = await waitOk(
      page,
      () => {
        const el = document.querySelector("[data-reveal]");
        return !!el && el.classList.contains("is-revealed");
      },
      6000,
    );
    record(
      "headless: [data-reveal] re-fires after swap (footer reveals on scroll, H1)",
      reArmed && revealed,
      `reArmed=${reArmed} revealed=${revealed}`,
    );
    await page.evaluate(() => window.scrollTo(0, 0));

    // ── Skip-link focus survives the swap (C1 / WCAG 2.4.1) ──────────────────
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    await page.keyboard.press("Tab"); // skip-link is the first focusable
    const skipFocused = await page.evaluate(
      () => document.activeElement?.getAttribute("href") === "#main",
    );
    record(
      "headless: skip-link is the first focusable after swap",
      skipFocused,
    );
    await page.keyboard.press("Enter"); // activate → fragment nav → focus #main
    const mainFocused = await page.evaluate(
      () => document.activeElement?.id === "main",
    );
    record(
      "headless: skip-link moves focus to #main after swap (C1/WCAG 2.4.1)",
      mainFocused,
    );

    // ── Hover the toggle to exercise prefetch (prefetchAll:true is the default
    // with <ClientRouter />; default strategy is hover) — its request must be
    // base-prefixed, asserted below with the rest. ───────────────────────────
    await page.hover("[data-language-toggle]");
    await sleep(300);

    // ── Reverse swap en→ar ───────────────────────────────────────────────────
    await page.click("[data-language-toggle]");
    const swappedToAr = await waitOk(
      page,
      () => document.documentElement.lang === "ar",
    );
    const ar2 = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    record(
      "headless: reverse swap en→ar is <html lang=ar dir=rtl> (C1/H6)",
      swappedToAr && ar2.lang === "ar" && ar2.dir === "rtl",
      JSON.stringify(ar2),
    );

    // ── Runtime same-origin + base-prefixed (H3/H9) ──────────────────────────
    // Every request (assets, prefetch, swap document fetches) must be same-origin
    // and base-prefixed — catches a base-path mis-resolution to a bare /path. The
    // browser's automatic /favicon.ico probe is the one allowed bare same-origin
    // path (it is not emitted by our code).
    const httpReqs = requests.filter((u) => /^https?:\/\//.test(u));
    const crossOrigin = httpReqs.filter((u) => {
      try {
        return new URL(u).host !== `${HOST}:${PORT}`;
      } catch {
        return true;
      }
    });
    record(
      "headless: every runtime request is same-origin (H3/H9, zero third-party)",
      crossOrigin.length === 0,
      crossOrigin.slice(0, 3).join(", "),
    );
    const barePath = httpReqs.filter((u) => {
      const p = new URL(u).pathname;
      return p !== "/favicon.ico" && !p.startsWith(BASE);
    });
    record(
      "headless: every runtime request is base-prefixed (no bare /path prefetch, H3)",
      barePath.length === 0,
      barePath.slice(0, 3).join(", "),
    );

    // ── Zero console errors across loads + swaps (H2; best-practices=100) ─────
    record(
      "headless: zero console errors across loads + swaps (H2)",
      consoleErrors.length === 0 && pageErrors.length === 0,
      [...consoleErrors, ...pageErrors].slice(0, 3).join(" | "),
    );

    await page.close();

    // ── Page B: prefers-reduced-motion (C1 / R1) ─────────────────────────────
    // The source-scan (motion-a11y.test.mjs) proves the reduce-motion @media block
    // EXISTS; this proves it WORKS — the computed animation/transition on the real
    // reveal + drifting-motif nodes collapses to instant, and the LCP heading is
    // opaque from first paint. A grep can't measure computed style; this is the
    // half only a headless browser can own.
    const rmPage = await browser.newPage();
    await rmPage.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await rmPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(rmPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );

    // Hero <h1> opaque at first paint under reduce-motion (R4 holds here too).
    const heroFirst = await rmPage.evaluate(() => {
      const h1 = document.querySelector("h1");
      return h1 ? getComputedStyle(h1).opacity : null;
    });
    record(
      "headless: reduce-motion hero <h1> opacity===1 at first paint (R4/C1)",
      heroFirst === "1",
      `opacity=${heroFirst}`,
    );

    // Every [data-reveal] + ambient motif node is motion-INERT: its computed
    // animation is `none`/instant AND its transition is instant (the global
    // reduce-motion `!important` block beats even the inline animation-duration on
    // the drifting leaves). `INSTANT=1ms` admits the block's 0.001ms collapse.
    const inert = await rmPage.evaluate(() => {
      const durMs = (v) =>
        Math.max(
          0,
          ...String(v)
            .split(",")
            .map((s) => {
              s = s.trim();
              if (s.endsWith("ms")) return parseFloat(s) || 0;
              if (s.endsWith("s")) return (parseFloat(s) || 0) * 1000;
              return parseFloat(s) || 0;
            }),
        );
      const INSTANT = 1;
      const probe = (els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          const animOff =
            s.animationName === "none" || durMs(s.animationDuration) <= INSTANT;
          const transOff = durMs(s.transitionDuration) <= INSTANT;
          return {
            ok: animOff && transOff,
            an: s.animationName,
            ad: s.animationDuration,
            td: s.transitionDuration,
          };
        });
      const reveals = probe([...document.querySelectorAll("[data-reveal]")]);
      const motifs = probe([...document.querySelectorAll(".ambient-leaf")]);
      return { reveals, motifs };
    });
    record(
      "headless: reduce-motion collapses [data-reveal] motion to instant (R1/R2)",
      inert.reveals.length > 0 && inert.reveals.every((r) => r.ok),
      `n=${inert.reveals.length} offenders=${JSON.stringify(
        inert.reveals.filter((r) => !r.ok).slice(0, 2),
      )}`,
    );
    record(
      "headless: reduce-motion collapses ambient motif drift to instant (R1/R2)",
      inert.motifs.length > 0 && inert.motifs.every((r) => r.ok),
      `n=${inert.motifs.length} offenders=${JSON.stringify(
        inert.motifs.filter((r) => !r.ok).slice(0, 2),
      )}`,
    );

    // Re-assert across a swap: the swapped-in page is also reduce-motion-respecting.
    await rmPage.click("[data-language-toggle]");
    await waitOk(rmPage, () => document.documentElement.lang === "en");
    const heroOpacity = await rmPage.evaluate(() => {
      const h1 = document.querySelector("h1");
      return h1 ? getComputedStyle(h1).opacity : null;
    });
    record(
      "headless: reduce-motion hero <h1> opacity===1 on a swapped-in page (C1)",
      heroOpacity === "1",
      `opacity=${heroOpacity}`,
    );
    await rmPage.close();
  } finally {
    await browser.close();
  }
}

// ── Boot preview + run both legs ─────────────────────────────────────────────
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

  // 5. Headless-browser leg — ClientRouter risk surface (LVR-03).
  await headlessLeg();
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
