// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// ── The single source of truth for the deployed URL ──────────────────────────
// GitHub Pages PROJECT pages serve under a sub-path, not the domain root. `site`
// + `base` below are the ONLY place these literals live; every internal link,
// asset, canonical, hreflang, OG url, sitemap <loc> and the robots Sitemap:
// directive derives from them via `import.meta.env.SITE` / `BASE_URL`
// (see src/lib/base.ts). A future custom domain flips `base` back to "/" and
// nothing else has to change.
const SITE = "https://ahmadjz.github.io";
const BASE = "/nabta-web-landing/";

// Pages that SITE-03 marks DRAFT (noindex) must ALSO be excluded from the
// sitemap. Append their *built* paths (e.g. "/nabta-web-landing/privacy/") here
// — the filter is already wired so SITE-03 only adds strings, never re-plumbs.
const SITEMAP_EXCLUDE = new Set(/** @type {string[]} */ ([]));

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
