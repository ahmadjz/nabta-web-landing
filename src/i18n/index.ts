import { ar, type Dict } from "./ar";
import { en } from "./en";

export type { Dict };

export type Locale = "ar" | "en";

export const LOCALES: readonly Locale[] = ["ar", "en"];
export const DEFAULT_LOCALE: Locale = "ar";

/** Document direction per locale (Arabic is RTL). */
export const DIR: Record<Locale, "rtl" | "ltr"> = { ar: "rtl", en: "ltr" };

const DICTS: Record<Locale, Dict> = { ar, en };

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}

/** Narrow `Astro.currentLocale` (string | undefined) to our Locale union. */
export function asLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : "ar";
}

/** The opposite locale — drives the language toggle. */
export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}
