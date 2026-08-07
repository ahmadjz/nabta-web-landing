// Preview-SERVED smoke check (SITE-01, extended in LVR-03). Boots `astro preview`
// (which honours `base`, unlike `astro dev` which serves at root and would pass
// while production 404s) and asserts the sub-path contract over HTTP. LVR-03 adds a
// HEADLESS-BROWSER leg (puppeteer-core driving the system Chrome — dev-only, no
// runtime third-party) that owns the ClientRouter risk surface: this is the FIRST
// runtime JS on a zero-JS site and the only nav that crosses locales, so its
// console/dir/focus/same-origin/reveal/reduce-motion regressions are gated RED here.
//
// Requires a prior `npm run build`. Exits non-zero on any failed check.
//
// The headless leg needs a Chrome binary. Its skip-vs-fail behaviour is env-gated
// (LPV2-08): by default (local dev) a missing Chrome SKIPS the leg (a warning, exit
// 0) so the HTTP sub-path contract still gates on a Chrome-less machine. But when
// REQUIRE_HEADLESS is set (CI — see .github/workflows/ci.yml) a missing Chrome is a
// HARD FAILURE, never a silent skip: the reduce-motion / toggle / LCP / coarse-pointer
// runtime proofs (the half a source-scan can't own) must actually RUN in CI, or the
// gate would be a no-op. Point Chrome at PUPPETEER_EXECUTABLE_PATH / CHROME_PATH.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const HOST = "127.0.0.1";
const PORT = 4321;
const BASE = process.env.NABTA_LANDING_BASE ?? "/nabta-web-landing/";
const ORIGIN = `http://${HOST}:${PORT}`;
const SITE = process.env.NABTA_LANDING_SITE ?? "https://ahmadjz.github.io";

const checks = [];
const record = (name, ok, detail = "") =>
  checks.push({ name, ok: !!ok, detail });

// CI sets REQUIRE_HEADLESS=1 so a missing Chrome FAILS (never silently skips) — the
// runtime reduce-motion/toggle/LCP/coarse-pointer proofs must actually run there.
// Exact "1" match (not truthiness) so a future `REQUIRE_HEADLESS=0` reads as OFF, not
// on (`!!"0"` would be `true`).
const REQUIRE_HEADLESS = process.env.REQUIRE_HEADLESS === "1";

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

/** In-page probe (serialized to the browser): is every [data-reveal] +
 *  .ambient-leaf node motion-INERT — its computed animation/transition collapsed
 *  to ≤1ms? Returns { reveals, motifs } arrays of { ok, an, ad, td }. Shared by the
 *  OS-reduce leg and the toggle-off leg so both assert the identical computed-style
 *  contract (INSTANT=1ms admits the 0.001ms `!important` collapse). */
function inertProbe() {
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
  return {
    reveals: probe([...document.querySelectorAll("[data-reveal]")]),
    motifs: probe([...document.querySelectorAll(".ambient-leaf")]),
  };
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
    if (REQUIRE_HEADLESS) {
      // CI (or any REQUIRE_HEADLESS run): a missing Chrome is a HARD FAILURE, never a
      // silent skip — record a failed check so the process exits non-zero. Without
      // this the whole reduce-motion/toggle/LCP/coarse-pointer proof would no-op.
      record(
        "headless leg: Chrome is REQUIRED (REQUIRE_HEADLESS set) but none was found",
        false,
        "set PUPPETEER_EXECUTABLE_PATH / CHROME_PATH — the runtime motion proofs must not be a silent no-op in CI",
      );
      return;
    }
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
    const inert = await rmPage.evaluate(inertProbe);
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
    // <html> is the scrolling box + sole owner of scroll-behavior — its smooth
    // scroll must collapse to instant (R1) so in-page anchor nav isn't animated.
    const rmScroll = await rmPage.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    record(
      "headless: reduce-motion sets root <html> scroll-behavior:auto (R1)",
      rmScroll === "auto",
      `scroll-behavior=${rmScroll}`,
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

    // ── Page C: the in-page motion toggle (LPV2-02) ──────────────────────────
    // OS reduce-motion is DELIBERATELY NOT emulated here, so anything that
    // collapses is the CSS TWIN (html[data-motion="off"]) driven by the toggle —
    // NOT the @media reduce block. This proves the two effective-motion signals
    // (OS-reduce and toggle-off) are independently triggerable, the half a
    // source-scan can't own.
    const tgPage = await browser.newPage();
    const tgConsole = [];
    tgPage.on("console", (m) => {
      if (m.type() === "error") tgConsole.push(m.text());
    });
    tgPage.on("pageerror", (e) => tgConsole.push(String(e)));
    await tgPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(tgPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );

    // The toggle is a real, labelled, keyboard-focusable control; aria-pressed
    // starts false (motion on) and the visible label is non-empty.
    const toggleBefore = await tgPage.evaluate(() => {
      const btn = document.querySelector("[data-motion-toggle]");
      if (!btn) return null;
      btn.focus();
      return {
        pressed: btn.getAttribute("aria-pressed"),
        label: (btn.textContent ?? "").trim(),
        focusable: document.activeElement === btn,
        tag: btn.tagName,
      };
    });
    record(
      "headless: motion toggle is a labelled, keyboard-focusable button, aria-pressed=false initially",
      !!toggleBefore &&
        toggleBefore.tag === "BUTTON" &&
        toggleBefore.pressed === "false" &&
        toggleBefore.label.length > 0 &&
        toggleBefore.focusable === true,
      JSON.stringify(toggleBefore),
    );

    // Toggle motion OFF (with OS-reduce OFF) → data-motion="off" + aria-pressed=true.
    await tgPage.click("[data-motion-toggle]");
    const toggledOff = await waitOk(
      tgPage,
      () => document.documentElement.dataset.motion === "off",
    );
    const pressedAfter = await tgPage.evaluate(() =>
      document
        .querySelector("[data-motion-toggle]")
        ?.getAttribute("aria-pressed"),
    );
    record(
      "headless: toggling off sets html[data-motion=off] + aria-pressed=true",
      toggledOff && pressedAfter === "true",
      `motionOff=${toggledOff} aria-pressed=${pressedAfter}`,
    );

    // Computed motion collapses to instant — the CSS twin works with OS-reduce OFF.
    const tgInert = await tgPage.evaluate(inertProbe);
    record(
      "headless: toggle-off collapses [data-reveal] motion to instant (CSS twin, OS-reduce OFF)",
      tgInert.reveals.length > 0 && tgInert.reveals.every((r) => r.ok),
      `n=${tgInert.reveals.length} offenders=${JSON.stringify(
        tgInert.reveals.filter((r) => !r.ok).slice(0, 2),
      )}`,
    );
    record(
      "headless: toggle-off collapses ambient motif drift to instant (CSS twin, OS-reduce OFF)",
      tgInert.motifs.length > 0 && tgInert.motifs.every((r) => r.ok),
      `n=${tgInert.motifs.length} offenders=${JSON.stringify(
        tgInert.motifs.filter((r) => !r.ok).slice(0, 2),
      )}`,
    );
    // The twin must collapse the ROOT <html> scroll-behavior too (with OS-reduce
    // OFF) — a descendant-only `html[data-motion=off] *` would miss <html>, leaving
    // in-page anchors (Learn more → #what-is-nabta, skip link) smooth-scrolling.
    const tgScroll = await tgPage.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    record(
      "headless: toggle-off sets root <html> scroll-behavior:auto (CSS twin matches root, OS-reduce OFF)",
      tgScroll === "auto",
      `scroll-behavior=${tgScroll}`,
    );

    // ── Persistence + NO-FLASH across a hard reload ──────────────────────────
    // The inline PRE-PAINT head script reads localStorage during <head> parse
    // (before the body paints, before reveal.ts's astro:page-load sets
    // data-motion-ready), so at DOMContentLoaded data-motion="off" is ALREADY
    // stamped — a reload can't flash motion.
    await tgPage.reload({ waitUntil: "domcontentloaded" });
    const early = await tgPage.evaluate(() => ({
      motion: document.documentElement.getAttribute("data-motion"),
      ready: document.documentElement.hasAttribute("data-motion-ready"),
    }));
    record(
      "headless: after reload data-motion=off is stamped pre-paint (persisted, inline head script → no flash)",
      early.motion === "off",
      JSON.stringify(early),
    );

    await waitOk(tgPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    const reloadInert = await tgPage.evaluate(inertProbe);
    record(
      "headless: motion stays instant after reload (persisted toggle-off)",
      reloadInert.reveals.length > 0 &&
        reloadInert.reveals.every((r) => r.ok) &&
        reloadInert.motifs.every((r) => r.ok),
      `reveals=${reloadInert.reveals.length} motifs=${reloadInert.motifs.length}`,
    );

    // ── Persistence across a ClientRouter swap ───────────────────────────────
    // The swapped-in <html> arrives WITHOUT data-motion (fresh server HTML);
    // motion-pref.ts's astro:page-load re-apply must re-stamp it from storage.
    await tgPage.click("[data-language-toggle]");
    const swappedEn = await waitOk(
      tgPage,
      () => document.documentElement.lang === "en",
    );
    const swapMotion = await waitOk(
      tgPage,
      () => document.documentElement.dataset.motion === "off",
    );
    record(
      "headless: toggle-off survives a ClientRouter swap (re-applied on astro:page-load)",
      swappedEn && swapMotion,
      `swappedEn=${swappedEn} motionOff=${swapMotion}`,
    );
    const swapInert = await tgPage.evaluate(inertProbe);
    record(
      "headless: motion stays instant on the swapped-in page (toggle-off persists)",
      swapInert.reveals.length > 0 &&
        swapInert.reveals.every((r) => r.ok) &&
        swapInert.motifs.every((r) => r.ok),
      `reveals=${swapInert.reveals.length} motifs=${swapInert.motifs.length}`,
    );

    record(
      "headless: zero console errors across toggle + reload + swap (H2)",
      tgConsole.length === 0,
      tgConsole.slice(0, 3).join(" | "),
    );
    await tgPage.close();

    // ── Page D — the signature hero foliage island (LPV2-03) ─────────────────
    // The `motion` island's runtime contract, only a real browser can prove:
    //   1. LCP stays the <h1> text — never a foliage/svg layer.
    //   2. static under effective-motion OFF (BOTH OS-reduce AND toggle-off with OS
    //      no-preference) — Motion has no built-in reduce-motion, so the island's
    //      isEffectiveMotionOff() early-return is the ONLY thing keeping it static.
    //   3. coarse-pointer no-op — no pointer parallax on touch (pointer:fine gate).
    // The foliage is desktop-only (`hidden lg:block`), so these run at an lg+
    // viewport where the layers actually render. A layer's transform is "static"
    // when it's identity/none (the island never armed styleEffect on it).
    const LG = { width: 1280, height: 900 };
    const HERO = "[data-hero-signature]";
    const LAYER = ".hero-foliage__layer";
    const DRIFT = ".hero-foliage__drift";
    const isStatic = (t) => t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)";
    const layerTransforms = (p) =>
      p.$$eval(LAYER, (els) => els.map((e) => getComputedStyle(e).transform));
    // BOTH Motion mechanisms the a11y gate must suppress: the pointer-parallax layers
    // (styleEffect springs) AND the idle-drift wrappers (animate()).
    const foliageTransforms = (p) =>
      p.$$eval(`${LAYER}, ${DRIFT}`, (els) =>
        els.map((e) => getComputedStyle(e).transform),
      );
    // Pin the primary-pointer fineness BEFORE page scripts run. Headless Chrome
    // reports `(pointer: fine)` = FALSE by default, which would VACUOUSLY satisfy the
    // "foliage stays static" legs even with a broken isEffectiveMotionOff() gate (the
    // parallax `layers` array just never gets built). So the reduce/toggle legs force
    // it TRUE — now the parallax path WOULD arm if the gate were removed, and the leg
    // genuinely proves the gate is what keeps the foliage static. D4 forces FALSE to
    // assert the opposite (touch → no parallax) path.
    const stubPointerFine = (p, fine) =>
      p.evaluateOnNewDocument((matches) => {
        const real = window.matchMedia.bind(window);
        window.matchMedia = (q) =>
          /\(\s*pointer\s*:\s*fine\s*\)/.test(q)
            ? {
                matches,
                media: q,
                addEventListener() {},
                removeEventListener() {},
                addListener() {},
                removeListener() {},
                onchange: null,
                dispatchEvent: () => false,
              }
            : real(q);
      }, fine);
    // Move the mouse across the hero centre (would drive parallax IF armed).
    const nudgeHero = async (p) => {
      const box = await p.$eval(HERO, (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await p.mouse.move(box.x - 60, box.y - 40, { steps: 3 });
      await p.mouse.move(box.x + 60, box.y + 40, { steps: 3 });
      await sleep(120); // let a couple of rAF frames land a transform write
    };

    // D1 — LCP is the <h1> (motion ON, foliage visible). Install the LCP observer
    // BEFORE any page script so `buffered:true` catches the entry.
    const lcpPage = await browser.newPage();
    await lcpPage.setViewport(LG);
    await lcpPage.evaluateOnNewDocument(() => {
      window.__lcpTag = null;
      new PerformanceObserver((list) => {
        const es = list.getEntries();
        const last = es[es.length - 1];
        if (last && last.element) window.__lcpTag = last.element.tagName;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await lcpPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(lcpPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    await sleep(400); // let LCP settle to the largest paint
    const foliageCount = await lcpPage.$$eval(LAYER, (els) => els.length);
    const lcpTag = await lcpPage.evaluate(() => window.__lcpTag);
    record(
      "headless: hero foliage layers render at lg viewport (signature is wired)",
      foliageCount >= 2,
      `layers=${foliageCount}`,
    );
    record(
      "headless: LCP element is the <h1> text, NOT a foliage/svg layer (LCP protected)",
      lcpTag === "H1",
      `lcp=${lcpTag}`,
    );
    await lcpPage.close();

    // D2 — static under OS reduce-motion. Force pointer:fine TRUE so the parallax
    // path would arm WERE the gate absent — this makes the leg actually exercise
    // isEffectiveMotionOff() rather than passing on the headless default coarse pointer.
    const rmFoliage = await browser.newPage();
    await rmFoliage.setViewport(LG);
    await rmFoliage.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await stubPointerFine(rmFoliage, true);
    await rmFoliage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(rmFoliage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    await nudgeHero(rmFoliage);
    const rmTransforms = await foliageTransforms(rmFoliage);
    record(
      "headless: OS-reduce keeps foliage static — layers AND drift (island honours isEffectiveMotionOff)",
      rmTransforms.length > 0 && rmTransforms.every(isStatic),
      `transforms=${JSON.stringify(rmTransforms)}`,
    );
    await rmFoliage.close();

    // D3 — static under the in-page toggle-off (OS no-preference). The DECISIVE gate
    // proof: with OS-reduce OFF, Motion's own (OS-only) reduce heuristic does NOT fire,
    // so ONLY isEffectiveMotionOff() reading html[data-motion="off"] can keep the
    // island static — for BOTH the styleEffect springs and the animate() drift. Force
    // pointer:fine TRUE so the parallax path is genuinely on the table.
    const tgFoliage = await browser.newPage();
    await tgFoliage.setViewport(LG);
    await stubPointerFine(tgFoliage, true);
    await tgFoliage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await tgFoliage.evaluate(() => localStorage.setItem("nabta-motion", "off"));
    await tgFoliage.reload({ waitUntil: "networkidle0" });
    await waitOk(tgFoliage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    const tgMotionOff = await tgFoliage.evaluate(
      () => document.documentElement.dataset.motion === "off",
    );
    await nudgeHero(tgFoliage);
    const tgTransforms = await foliageTransforms(tgFoliage);
    record(
      "headless: toggle-off (OS no-preference) keeps foliage static — layers AND drift (isEffectiveMotionOff)",
      tgMotionOff && tgTransforms.length > 0 && tgTransforms.every(isStatic),
      `motionOff=${tgMotionOff} transforms=${JSON.stringify(tgTransforms)}`,
    );
    await tgFoliage.close();

    // D4 — coarse-pointer no-op (motion ON). Force pointer:fine FALSE so the island
    // takes the touch path (no pointermove listener). A pointermove over the hero must
    // then leave every LAYER at identity (no parallax on touch); the idle drift is
    // allowed to run on touch, so only the parallax layers are sampled here.
    const coarsePage = await browser.newPage();
    await coarsePage.setViewport(LG);
    await stubPointerFine(coarsePage, false);
    await coarsePage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(coarsePage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    await nudgeHero(coarsePage);
    const coarseTransforms = await layerTransforms(coarsePage);
    record(
      "headless: coarse pointer is a no-op — a pointermove leaves foliage layers at identity (no touch parallax)",
      coarseTransforms.length > 0 && coarseTransforms.every(isStatic),
      `transforms=${JSON.stringify(coarseTransforms)}`,
    );
    await coarsePage.close();

    // ── Page E — scroll choreography + magnetic CTA (LPV2-04) ────────────────
    // Runtime contracts a source-scan (R8) can't prove:
    //   1. OS-reduce → every [data-scroll-*] node computes animation-timeline:none
    //      (progress-based, so the duration-collapse alone can't stop it) AND its
    //      transform rests at identity.
    //   2. toggle-off (OS no-preference) → SAME, proving the html[data-motion=off]
    //      twin governs the scroll timeline independently of the @media query.
    //   3. the named crossfade sits on a LOCALE-INVARIANT <main> (never the
    //      header/wordmark, H6) + the ar↔en swap still lands dir/lang/face.
    //   4. coarse pointer → the magnetic CTA never drifts under the finger.
    const SCROLL_SEL = "[data-scroll-anim], [data-scroll-parallax]";
    const MAGNET_SEL = "[data-magnetic]";
    const scrollNodes = (p) =>
      p.$$eval(SCROLL_SEL, (els) =>
        els.map((e) => ({
          tl: getComputedStyle(e).animationTimeline,
          tf: getComputedStyle(e).transform,
        })),
      );

    // E1 — OS reduce-motion neutralises the scroll timeline.
    const rmScrollPage = await browser.newPage();
    await rmScrollPage.setViewport(LG);
    await rmScrollPage.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await rmScrollPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(rmScrollPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    const rmScrollNodes = await scrollNodes(rmScrollPage);
    record(
      "headless: OS-reduce sets animation-timeline:none + identity transform on every scroll-driven node (R8 runtime)",
      rmScrollNodes.length > 0 &&
        rmScrollNodes.every((n) => n.tl === "none" && isStatic(n.tf)),
      `n=${rmScrollNodes.length} ${JSON.stringify(rmScrollNodes.slice(0, 2))}`,
    );
    await rmScrollPage.close();

    // E2 — the in-page toggle-off (OS no-preference) does the same via the CSS
    // twin — the DECISIVE proof the two signals are independently triggerable.
    const tgScrollPage = await browser.newPage();
    await tgScrollPage.setViewport(LG);
    await tgScrollPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await tgScrollPage.evaluate(() =>
      localStorage.setItem("nabta-motion", "off"),
    );
    await tgScrollPage.reload({ waitUntil: "networkidle0" });
    await waitOk(tgScrollPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    const tgScrollOff = await tgScrollPage.evaluate(
      () => document.documentElement.dataset.motion === "off",
    );
    const tgScrollNodes = await scrollNodes(tgScrollPage);
    record(
      "headless: toggle-off (OS no-preference) sets animation-timeline:none + identity on scroll-driven nodes (CSS twin, R8)",
      tgScrollOff &&
        tgScrollNodes.length > 0 &&
        tgScrollNodes.every((n) => n.tl === "none" && isStatic(n.tf)),
      `motionOff=${tgScrollOff} n=${tgScrollNodes.length} ${JSON.stringify(
        tgScrollNodes.slice(0, 2),
      )}`,
    );
    await tgScrollPage.close();

    // E3 — the named crossfade is on a locale-invariant element (main), NOT the
    // header/wordmark (H6); the ar→en swap WITH it active still lands correctly.
    const vtPage = await browser.newPage();
    await vtPage.setViewport(LG);
    await vtPage.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
    await waitOk(vtPage, () =>
      document.documentElement.hasAttribute("data-motion-ready"),
    );
    const vtNames = await vtPage.evaluate(() => {
      const name = (el) =>
        el ? getComputedStyle(el).viewTransitionName : null;
      const brand = [...document.querySelectorAll("header a")].find(
        (a) => !a.hasAttribute("data-language-toggle"),
      );
      return {
        main: name(document.querySelector("main")),
        brand: name(brand),
      };
    });
    record(
      "headless: the named crossfade is on <main> (locale-invariant), NOT the header brand/wordmark (H6)",
      !!vtNames.main &&
        vtNames.main !== "none" &&
        (vtNames.brand === "none" || vtNames.brand === null),
      JSON.stringify(vtNames),
    );
    await vtPage.click("[data-language-toggle]");
    const vtSwapped = await waitOk(
      vtPage,
      () => document.documentElement.lang === "en",
    );
    const vtAfter = await vtPage.evaluate(() => {
      const brand = [...document.querySelectorAll("header a")].find(
        (a) => !a.hasAttribute("data-language-toggle"),
      );
      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        brandHref: brand ? new URL(brand.href).pathname : null,
      };
    });
    record(
      "headless: ar→en swap with the crossfade active keeps <html lang=en dir=ltr> + /en/ brand href (H6)",
      vtSwapped &&
        vtAfter.lang === "en" &&
        vtAfter.dir === "ltr" &&
        vtAfter.brandHref === `${BASE}en/`,
      JSON.stringify(vtAfter),
    );
    await vtPage.close();

    // Prior toggle-off legs (Page C, E2) persist nabta-motion="off" in this
    // origin's SHARED localStorage — which would make the magnetic island stay
    // static for the WRONG reason (motion-off, not the pointer gate). E4/E5 must
    // load with motion ON, so they clear it + reload before asserting the gate.
    const withMotionOn = async (page, fine) => {
      await stubPointerFine(page, fine);
      await page.goto(`${ORIGIN}${BASE}`, { waitUntil: "networkidle0" });
      await page.evaluate(() => localStorage.removeItem("nabta-motion"));
      await page.reload({ waitUntil: "networkidle0" });
      await waitOk(page, () =>
        document.documentElement.hasAttribute("data-motion-ready"),
      );
      return page.evaluate(
        () => document.documentElement.dataset.motion !== "off",
      );
    };

    // E4 — magnetic CTA coarse-pointer no-op (with motion ON). Force pointer:fine
    // FALSE → the island takes the touch path (no pointermove listener); a
    // pointermove near the CTA must leave [data-magnetic] at identity — proving the
    // POINTER gate (not motion-off) is what keeps it static.
    const magPage = await browser.newPage();
    await magPage.setViewport(LG);
    const e4MotionOn = await withMotionOn(magPage, false);
    const magBox = await magPage.$eval(MAGNET_SEL, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await magPage.mouse.move(magBox.x - 40, magBox.y, { steps: 3 });
    await magPage.mouse.move(magBox.x + 8, magBox.y + 4, { steps: 3 });
    await sleep(120); // let a couple of rAF frames land (they must NOT, on touch)
    const magTransforms = await magPage.$$eval(MAGNET_SEL, (els) =>
      els.map((e) => getComputedStyle(e).transform),
    );
    record(
      "headless: coarse pointer is a no-op with motion ON — a pointermove leaves the magnetic CTA at identity (pointer gate, not motion-off)",
      e4MotionOn && magTransforms.length > 0 && magTransforms.every(isStatic),
      `motionOn=${e4MotionOn} transforms=${JSON.stringify(magTransforms)}`,
    );
    await magPage.close();

    // E5 — the magnetic pull ACTUALLY fires under a fine pointer (motion ON). E4
    // only proves the negative (touch → identity), which a completely-unwired
    // script would also pass — so this positive leg is what proves the island is
    // imported + the [data-magnetic] selector matches + the spring runs. Force
    // pointer:fine TRUE, move NEAR (offset from centre so dx/dy ≠ 0) but within
    // radius, then wait for the spring to push [data-magnetic] off identity.
    const magFinePage = await browser.newPage();
    await magFinePage.setViewport(LG);
    const e5MotionOn = await withMotionOn(magFinePage, true);
    const magFineBox = await magFinePage.$eval(MAGNET_SEL, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await magFinePage.mouse.move(magFineBox.x + 45, magFineBox.y + 20, {
      steps: 4,
    });
    // Wait for a MEANINGFUL (> 1px) pull, not a sub-pixel transient: the spring
    // ramps 0 → ~10px over ~300ms, and getComputedStyle rounds the very first
    // frames to identity — a bare `!== identity` check would flake at that scale.
    const pulled = await waitOk(
      magFinePage,
      () => {
        const el = document.querySelector("[data-magnetic]");
        if (!el) return false;
        const t = getComputedStyle(el).transform;
        if (t === "none") return false;
        const m = new DOMMatrixReadOnly(t);
        return Math.hypot(m.m41, m.m42) > 1;
      },
      4000,
    );
    record(
      "headless: fine pointer ARMS the magnetic pull — a pointermove near the CTA translates [data-magnetic] > 1px off identity (island wired + functional)",
      e5MotionOn && pulled,
      `motionOn=${e5MotionOn} pulled=${pulled}`,
    );
    await magFinePage.close();
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

  // 3. The base-path proof: project Pages must reject bare root; apex hosting
  // must serve it. This keeps both published contracts independently audited.
  const bare = await fetch(`${ORIGIN}/`, { redirect: "manual" });
  record(
    BASE === "/"
      ? "bare / is served for apex hosting"
      : "bare / is not served (project base enforced)",
    BASE === "/" ? bare.status === 200 : bare.status === 404,
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

// REQUIRE_HEADLESS belt-and-suspenders (CI): the headless leg must have actually
// produced its browser checks. This catches a leg that returned early for any reason
// OTHER than a missing Chrome — a green run with zero "headless:" checks would mean
// the whole runtime motion proof silently no-op'd. When Chrome is missing the leg
// already records its own hard failure (→ exit 1), so we skip this one to avoid a
// redundant second failure line for the same root cause.
if (REQUIRE_HEADLESS && !crashed) {
  const chromeMissing = checks.some((c) => /Chrome is REQUIRED/.test(c.name));
  if (!chromeMissing) {
    const headlessRan = checks.some((c) => c.name.startsWith("headless:"));
    record(
      "headless leg produced its browser checks (REQUIRE_HEADLESS)",
      headlessRan,
      headlessRan
        ? ""
        : "no headless: checks recorded — the runtime motion proof was a no-op",
    );
  }
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
