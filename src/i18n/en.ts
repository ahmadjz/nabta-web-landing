import type { Dict } from "./ar";

/**
 * English chrome strings. Typed `: Dict` so it MUST mirror `ar.ts` key-for-key —
 * the TypeScript compiler is the parity gate (no missing/extra keys can ship).
 */
export const en: Dict = {
  siteName: "Nabta",
  tagline: "Your plant world, in your hands",
  /** Shown on English pages; links to the Arabic counterpart (the other endonym). */
  switchToOther: "العربية",
  nav: {
    home: "Home",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  home: {
    heroTitle: "Nabta — your companion in the world of plants",
    heroSubtitle:
      "Shop ornamental plants, care for your plants, and get expert care tips — all from the Nabta app.",
  },
  footer: {
    legal: "Legal",
    contact: "Contact us",
    rights: "All rights reserved.",
  },
  notFound: {
    title: "Page not found",
    body: "Sorry, the page you're looking for doesn't exist.",
    backHome: "Back to home",
  },
  skipToContent: "Skip to content",
};
