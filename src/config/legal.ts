/**
 * The single gate for the legal pages (SITE-03). While `LEGAL_IS_DRAFT` is true,
 * ONE flag drives all three of:
 *   - the visible "DRAFT — pending legal review" banner (DraftBanner.astro),
 *   - the `<meta name="robots" content="noindex">` on every legal page, and
 *   - their exclusion from the sitemap (wired in astro.config.mjs).
 *
 * Clearing it (set to `false`) un-gates indexing AND unblocks the Play-Store
 * submission of the privacy URL — so it must NOT be cleared until legal counsel
 * has supplied the binding privacy + terms text. `/privacy` and `/terms` are
 * STABLE contract URLs either way (the Play Console references the privacy one) —
 * they never relocate across redeploys.
 */
export const LEGAL_IS_DRAFT = true;
