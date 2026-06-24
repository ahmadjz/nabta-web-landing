import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/base";
import { BRAND_COLOR } from "../config";

// The web-app manifest is GENERATED (not a static public/ file) so its icon `src`
// + `start_url` derive from the single config source (site + base) via
// absoluteUrl() and survive a future custom-domain switch automatically — exactly
// like robots.txt.ts. Prerendered at build → dist/site.webmanifest. The PNG icons
// it references are produced by scripts/gen-icons.mjs.
export const GET: APIRoute = () => {
  const manifest = {
    name: "Nabta",
    short_name: "Nabta",
    start_url: absoluteUrl("/"),
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_COLOR,
    icons: [
      {
        src: absoluteUrl("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: absoluteUrl("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
};
