// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { LEGAL_IS_DRAFT } from "./src/config/legal.ts";
import { LEGAL_PAIRS } from "./src/i18n/page-pairs.ts";

// ── The single source of truth for the deployed URL ──────────────────────────
// GitHub Pages PROJECT pages serve under a sub-path, not the domain root. `site`
// + `base` below are the ONLY place these literals live; every internal link,
// asset, canonical, hreflang, OG url, sitemap <loc> and the robots Sitemap:
// directive derives from them via `import.meta.env.SITE` / `BASE_URL`
// (see src/lib/base.ts). A future custom domain flips `base` back to "/" and
// nothing else has to change.
const SITE = "https://ahmadjz.github.io";
const BASE = "/nabta-web-landing/";

// Draft legal pages (noindex) must ALSO be excluded from the sitemap — the same
// `LEGAL_IS_DRAFT` flag that drives the banner + noindex drives this, so the three
// can never disagree. Built paths are base-prefixed with a trailing slash
// (directory output), e.g. "/nabta-web-landing/privacy/". Clearing the flag (when
// legal text lands) drops the exclusion and the pages enter the sitemap unchanged.
const legalBuiltPaths = LEGAL_PAIRS.flatMap((pair) =>
  [pair.ar, pair.en].map((path) => `${BASE}${path.replace(/^\//, "")}/`),
);
const SITEMAP_EXCLUDE = new Set(
  /** @type {string[]} */ (LEGAL_IS_DRAFT ? legalBuiltPaths : []),
);

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  // Astro v6 changed i18n routing defaults — set them explicitly so ar stays
  // un-prefixed at "/" and en lives at "/en/" regardless of the Astro version.
  i18n: {
    defaultLocale: "ar",
    locales: ["ar", "en"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      // Emit reciprocal ar/en alternates in the sitemap from the same locale
      // model the pages use. defaultLocale (ar) must appear in the keys.
      i18n: {
        defaultLocale: "ar",
        locales: { ar: "ar", en: "en" },
      },
      // `page` is the absolute, already-base-prefixed URL string.
      filter: (page) => !SITEMAP_EXCLUDE.has(new URL(page).pathname),
    }),
  ],
  vite: {
    // Tailwind v4 ships as a Vite plugin — there is NO tailwind.config.* file;
    // the theme lives in src/styles/global.css via @theme.
    plugins: [tailwindcss()],
  },
});
