/**
 * Feature-tile icons, mapped BY ARRAY INDEX onto `marketing.features.items`
 * (LVR-05). Kept OUT of the i18n dict on purpose: an `icon` key inside the list
 * items would add a per-item key path and break the strict ar/en key-path parity
 * gate (test/marketing.test.mjs). Instead this single typed tuple is the source of
 * truth for both `Features.astro` and `test/features.test.mjs`.
 *
 * `as const` gives a literal tuple, so the `<Icon name={FEATURE_ICONS[i]} />`
 * call-site type-checks each entry against `IconName` and an invalid name fails
 * the build at render (the dispatcher resolves an `undefined` component).
 * `test/features.test.mjs` pins this tuple's length === features.items.length in
 * BOTH locales, so copy and icons can never desync on one locale.
 */
export const FEATURE_ICONS = [
  "store",
  "sparkle-assistant",
  "watering-can",
  "plant-doctor",
  "truck",
  "globe",
] as const;

/** Glyphs whose horizontal sense must mirror under RTL (e.g. the delivery truck). */
export const MIRROR_IN_RTL = new Set<(typeof FEATURE_ICONS)[number]>(["truck"]);
