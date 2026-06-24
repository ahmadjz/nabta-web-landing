/**
 * Arabic chrome strings — the SOURCE OF TRUTH for the i18n dictionary shape.
 * `en.ts` is typed `: Dict` and so is parity-checked against this file at compile
 * time (a missing or extra key fails `npm run build`). Marketing/legal *content*
 * parity is handled per-page by SITE-02/03, not here.
 *
 * Note: no `as const` — values infer as `string` so `Dict` describes the shape,
 * not the literals.
 */
export const ar = {
  siteName: "نبتة",
  tagline: "عالم نباتاتك بين يديك",
  /** Shown on Arabic pages; links to the English counterpart (the other endonym). */
  switchToOther: "English",
  nav: {
    home: "الرئيسية",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
  },
  home: {
    heroTitle: "نبتة — رفيقك في عالم النباتات",
    heroSubtitle:
      "تسوّق نباتات الزينة، واعتنِ بنباتاتك، واحصل على نصائح العناية — كل ذلك من تطبيق نبتة.",
  },
  footer: {
    legal: "روابط قانونية",
    contact: "تواصل معنا",
    rights: "جميع الحقوق محفوظة.",
  },
  notFound: {
    title: "الصفحة غير موجودة",
    body: "عذرًا، الصفحة التي تبحث عنها غير موجودة.",
    backHome: "العودة إلى الصفحة الرئيسية",
  },
  skipToContent: "تخطَّ إلى المحتوى",
};

/** The chrome-string dictionary shape (derived from the Arabic source of truth). */
export type Dict = typeof ar;
