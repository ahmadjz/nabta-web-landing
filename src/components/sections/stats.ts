/**
 * Impact-stat NUMBERS, mapped BY ARRAY INDEX onto `marketing.stats.items`
 * (LPV2-05). Kept OUT of the i18n dict on purpose — exactly like
 * `feature-icons.ts`: a `countTo`/`suffix` key inside the list items would add a
 * per-item key path and break the strict ar/en key-path parity gate
 * (test/marketing.test.mjs). The numbers are also LOCALE-INVARIANT (the same fact
 * is true in Arabic and English), so this single typed tuple is the source of
 * truth for both `Stats.astro` and `test/stats.test.mjs`; only the **label** is
 * translated.
 *
 * HONESTY (Decision Log Q7): for a PRE-LAUNCH app these are VERIFIABLE product
 * facts only — never fabricated user metrics ("10k happy users"). Each number is
 * sourced in the task's `## Decisions / Q&A (execution)`:
 *   • 6 — core features/value props (the Features bento; FEATURE_ICONS.length,
 *         parity-pinned to features.items). test/stats.test couples STATS[0] to it.
 *   • 3 — care-support surfaces: smart suggester + care manager/reminders + AI
 *         plant doctor (three of the six features form the "keep plants healthy"
 *         loop; onboarding.md's three flagship value props).
 *   • 2 — languages: Arabic (default, RTL) + English (astro.config `locales`).
 *
 * count-up contract: the `<span data-count-up data-count-to={countTo}
 * data-count-suffix={suffix}>{countTo}{suffix}</span>` server-renders the REAL
 * fact as its own text, so no-JS/crawler readers + the runtime `.sr-only`
 * snapshot see the true number; count-up.ts animates a fresh aria-hidden 0→N
 * sibling on top. `countTo` is finite; `suffix` (e.g. "+", "%") rides the visible
 * fact — empty here because these are EXACT counts, not approximations.
 */
export interface Stat {
  /** The final (real) number the count-up settles on. Finite, positive. */
  countTo: number;
  /** Trailing glyph shown in the visible fact ("+", "%", …). "" for exact counts. */
  suffix: string;
}

export const STATS = [
  { countTo: 6, suffix: "" },
  { countTo: 3, suffix: "" },
  { countTo: 2, suffix: "" },
] as const satisfies readonly Stat[];

/**
 * Decorative stat icons, mapped BY ARRAY INDEX onto `marketing.stats.items` (same
 * numbers-out-of-dict discipline as `feature-icons.ts` / `STATS`). Every glyph is
 * an aria-hidden decorative accent paired with its adjacent count-up number +
 * translated label. `as const` lets the `<Icon name={STAT_ICONS[i]} />` call-site
 * type-check each entry against `IconName` (an invalid name fails the build).
 */
export const STAT_ICONS = [
  "sparkle-assistant",
  "watering-can",
  "globe",
] as const;
