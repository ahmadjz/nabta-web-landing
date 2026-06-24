import type { Locale } from "./index";

/**
 * The canonical ar↔en page map. The language toggle AND the hreflang alternates
 * BOTH read this one map, so an alternate can never dangle: a page's counterpart
 * is defined in exactly one place. `/privacy` and `/terms` are STABLE contract
 * URLs (the Play Console references the privacy one) — they are pinned here at
 * scaffold time even though SITE-03 builds the actual page files. SITE-03 only
 * appends rows here; it never re-plumbs the toggle or hreflang.
 *
 * Paths are UN-based (no "/nabta-web-landing" prefix) — callers wrap them in
 * `withBase()` / `absoluteUrl()` from src/lib/base.ts.
 */
export interface PagePair {
  key: string;
  /** Arabic (default-locale) path, e.g. "/" or "/privacy". */
  ar: string;
  /** English path, e.g. "/en/" or "/en/privacy". */
  en: string;
  /** Legal pages are listed in the footer + get SITE-03's DRAFT/noindex treatment. */
  legal?: boolean;
}

export const PAGE_PAIRS: readonly PagePair[] = [
  { key: "home", ar: "/", en: "/en/" },
  { key: "privacy", ar: "/privacy", en: "/en/privacy", legal: true },
  { key: "terms", ar: "/terms", en: "/en/terms", legal: true },
];

/** Legal subset, in footer order. */
export const LEGAL_PAIRS: readonly PagePair[] = PAGE_PAIRS.filter(
  (p) => p.legal,
);

export function pairFor(key: string): PagePair | undefined {
  return PAGE_PAIRS.find((p) => p.key === key);
}

/** The un-based path for a page key in a given locale. */
export function pathFor(key: string, locale: Locale): string | undefined {
  return pairFor(key)?.[locale];
}
