/**
 * Site-level NON-URL constants. The deploy URL itself (site + base) lives ONLY
 * in astro.config.mjs — do not duplicate it here. These are the config seams the
 * later tasks flip:
 *
 * - SITE-02 wires the download CTA to PLAY_STORE_URL (empty ⇒ "coming soon", never
 *   a dead store link) and the contact block to CONTACT_EMAIL.
 * - SITE-03 reuses CONTACT_EMAIL in the privacy/terms "contact us" sections.
 */

/** One contact address feeds the footer + (SITE-03) the legal "contact us" blocks. */
export const CONTACT_EMAIL = "hello@nabta.app"; // TODO(SITE-02): confirm real address

/** Empty ⇒ the download CTA renders a disabled "coming soon" (chicken-and-egg: the
 *  Play listing needs THIS site's privacy URL first). Flip on launch. */
export const PLAY_STORE_URL = "";
