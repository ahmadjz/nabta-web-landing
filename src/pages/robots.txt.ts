import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/base";

// robots.txt is GENERATED (not a static public/ file) so its absolute, base-
// prefixed Sitemap: URL derives from the single config source (site + base) and
// survives a future custom-domain switch automatically. Prerendered at build →
// dist/robots.txt.
export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap-index.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
