/**
 * URL helpers — the ONLY sanctioned way to build internal links and absolute
 * URLs. Both the sub-path `base` and the `site` origin come from astro.config.mjs
 * (read here via `import.meta.env`), so there is a single source of truth and a
 * future custom-domain switch (base → "/") needs no change in calling code.
 *
 * Never emit a bare "/privacy" — on GitHub Pages project pages that 404s.
 */

const BASE: string = import.meta.env.BASE_URL; // e.g. "/nabta-web-landing/"
const SITE: string = import.meta.env.SITE ?? ""; // e.g. "https://ahmadjz.github.io"

const BASE_NO_SLASH = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;

/** Prefix an internal path with the deploy base. `withBase("/")` → the base root. */
export function withBase(path = "/"): string {
  const rel = path.startsWith("/") ? path : `/${path}`;
  return rel === "/" ? `${BASE_NO_SLASH}/` : `${BASE_NO_SLASH}${rel}`;
}

/**
 * Remove the deploy base from a pathname so it can be re-based cleanly (avoids a
 * double prefix). Tolerates a pathname that already lacks the base.
 */
export function stripBase(pathname: string): string {
  if (pathname === BASE_NO_SLASH) return "/";
  if (pathname.startsWith(`${BASE_NO_SLASH}/`)) {
    return pathname.slice(BASE_NO_SLASH.length);
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

/**
 * Absolute, base-prefixed URL — for canonical, OG `url`, hreflang, sitemap and
 * the robots Sitemap: directive. Accepts an un-based path.
 */
export function absoluteUrl(path = "/"): string {
  return new URL(withBase(path), SITE).href;
}
