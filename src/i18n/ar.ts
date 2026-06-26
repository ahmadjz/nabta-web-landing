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
  /**
   * Marketing-landing content (SITE-02). STRICT ar/en parity: every key here is
   * mirrored in en.ts, AND a runtime test (test/marketing.test.mjs) deep-compares
   * key paths incl. array lengths — keep the `items`/`shots` arrays the same length
   * in both locales. Copy is sourced from 00-vision.md + 04-features (accurate to
   * the real product). Screenshots + testimonials are PLACEHOLDERS until launch.
   */
  marketing: {
    /** The disabled "coming soon" download control (PLAY_STORE_URL is empty). */
    cta: {
      label: "حمّل تطبيق نبتة",
      comingSoon: "قريبًا",
      ariaComingSoon: "تحميل تطبيق نبتة — قريبًا، غير متاح بعد",
    },
    hero: {
      eyebrow: "تطبيق نبتة",
      title: "كل ما يخص نباتاتك في مكان واحد",
      subtitle:
        "تسوّق نباتات الزينة، واطلب توصيلها إلى بابك، واعتنِ بها بخطوات سهلة — بدعمٍ من الخبراء والذكاء الاصطناعي.",
      /** Ghost CTA next to the download button — scrolls to the explainer section. */
      ctaSecondary: "اعرف المزيد",
      /** Overlapping "care chip" on the botanical hero stage (decorative sample). */
      floatingChip: {
        label: "تذكير الريّ",
        value: "بعد يومين",
      },
    },
    whatIs: {
      /** Clay kicker above the heading (LVR-05 two-col editorial). */
      eyebrow: "تعرّف على نبتة",
      heading: "ما هي نبتة؟",
      body1:
        "نبتة تطبيق لبيع النباتات، لكنه أكثر من مجرّد متجر: إنه علاقة بينك وبين نباتاتك يدعمها خبراء ومساعد ذكي. تصفّح نباتات الزينة، واحصل على اقتراحات تناسب خبرتك وظروف منزلك، ثم أتمم الطلب والتوصيل بسهولة.",
      body2:
        "بعد الشراء تتحوّل كل نبتة إلى عنصر في قائمة عنايتك مع تذكيرات الريّ والتسميد، ويمكنك سؤال خبير أو الحصول على إجابة مدعومة بالذكاء الاصطناعي عند ظهور أي مشكلة.",
    },
    features: {
      heading: "لماذا نبتة؟",
      subheading: "كل ما تحتاجه لاقتناء النباتات والعناية بها في تطبيق واحد.",
      items: [
        {
          title: "متجر نباتات الزينة",
          body: "تصفّح وتسوّق تشكيلة من نباتات الزينة بأسعار واضحة بالليرة السورية، مع بحث يطابق الأسماء المحلية والعلمية والإنجليزية معًا.",
        },
        {
          title: "المساعد الذكي للاختيار",
          body: "لا تعرف أي نبتة تناسبك؟ أجب عن أسئلة بسيطة حول المساحة والإضاءة وحاجة الريّ ومستوى خبرتك، ودع نبتة تقترح عليك قائمة مختارة.",
        },
        {
          title: "مدير العناية بالنبات",
          body: "لكل نبتة تمتلكها قائمة عناية خاصة بمواعيد الريّ والتسميد وتذكيرات تصلك في وقتها، لتبقى نباتاتك بصحة جيدة.",
        },
        {
          title: "طبيب النبات بالذكاء الاصطناعي",
          body: "أرسل صورة وسؤالًا عن مشكلة في نبتتك، فيُعِدّ الذكاء الاصطناعي إجابة يراجعها خبير عناية قبل أن تصلك — نصيحة موثوقة لا تخمين.",
        },
        {
          title: "توصيل ودفع مرن",
          body: "اطلب نباتاتك إلى بابك وادفع نقدًا عند الاستلام أو عبر التحويل البنكي مع رفع إيصال الدفع — طرق دفع يديرها الفريق بمرونة.",
        },
        {
          title: "تجربة عربية أولًا",
          body: "واجهة عربية كاملة من اليمين إلى اليسار مع إمكانية التبديل إلى الإنجليزية، وأسعار تُعرض دائمًا بالليرة السورية.",
        },
      ],
    },
    screenshots: {
      heading: "نظرة داخل التطبيق",
      subheading: "لقطات من تجربة نبتة.",
      placeholderBadge: "صورة توضيحية مؤقتة",
      shots: [
        {
          alt: "لقطة شاشة توضيحية: تصفّح متجر النباتات في تطبيق نبتة",
          caption: "تصفّح المتجر",
        },
        {
          alt: "لقطة شاشة توضيحية: المساعد الذكي لاختيار النبات",
          caption: "المساعد الذكي",
        },
        {
          alt: "لقطة شاشة توضيحية: قائمة العناية بالنبات والتذكيرات",
          caption: "العناية والتذكيرات",
        },
      ],
    },
    testimonials: {
      heading: "ماذا يقول مستخدمونا",
      subheading: "آراء توضيحية تُستبدل بشهادات حقيقية عند الإطلاق.",
      placeholderBadge: "شهادة توضيحية مؤقتة",
      items: [
        {
          quote:
            "ساعدني المساعد الذكي على اختيار أول نبتة منزلية لي، وما زالت بصحة ممتازة بفضل التذكيرات.",
          name: "نموذج مستخدم",
          role: "هاوٍ مبتدئ",
        },
        {
          quote:
            "يعجبني أنني أدفع نقدًا عند الاستلام، وكان التوصيل سريعًا ووصلت نباتاتي سليمة.",
          name: "نموذج مستخدم",
          role: "عميل",
        },
        {
          quote:
            "عندما اصفرّت أوراق نبتتي أرسلت صورة فحصلت على نصيحة راجعها خبير — خدمة رائعة.",
          name: "نموذج مستخدم",
          role: "هاوٍ متمرّس",
        },
      ],
    },
    faq: {
      heading: "الأسئلة الشائعة",
      items: [
        {
          q: "هل تطبيق نبتة متاح الآن؟",
          a: "التطبيق قيد الإطلاق. سيتوفّر للتحميل على Google Play قريبًا ثم على App Store لاحقًا. تابع هذه الصفحة للتحديثات.",
        },
        {
          q: "ماذا يمكنني أن أشتري من نبتة؟",
          a: "نباتات الزينة بأنواعها، مع وصف وأسعار واضحة وبحث يطابق الأسماء المحلية والعلمية والإنجليزية.",
        },
        {
          q: "كيف يعمل المساعد الذكي للاختيار؟",
          a: "تجيب عن أسئلة بسيطة حول المساحة والإضاءة وحاجة الريّ ومستوى خبرتك، فيقترح عليك التطبيق قائمة نباتات مناسبة.",
        },
        {
          q: "نبتتي مريضة، هل يمكن أن تساعدني نبتة؟",
          a: "نعم. أرسل صورة وسؤالًا عبر طبيب النبات، فيُعِدّ الذكاء الاصطناعي إجابة يراجعها خبير عناية قبل إرسالها إليك.",
        },
        {
          q: "ما طرق الدفع المتاحة؟",
          a: "الدفع نقدًا عند الاستلام متاح دائمًا، إضافة إلى التحويل البنكي مع رفع إيصال الدفع لمراجعته من الفريق.",
        },
        {
          q: "بأي لغة وعملة يعمل التطبيق؟",
          a: "العربية افتراضيًا مع إمكانية التبديل إلى الإنجليزية، وتُعرض الأسعار دائمًا بالليرة السورية.",
        },
      ],
    },
    download: {
      heading: "جاهز لتبدأ مع نباتاتك؟",
      body: "سيتوفّر تطبيق نبتة على Google Play قريبًا، ويليه App Store. احفظ هذه الصفحة وعُد إليها عند الإطلاق.",
      note: "قريبًا على Google Play · App Store لاحقًا",
    },
    contact: {
      heading: "تواصل معنا",
      body: "هل لديك سؤال أو ملاحظة؟ راسلنا عبر البريد الإلكتروني وسنردّ عليك. (لا يوجد نموذج — تواصل مباشر فقط.)",
      emailLabel: "البريد الإلكتروني",
      whatsappLabel: "واتساب",
      phoneLabel: "الهاتف",
    },
  },
  /**
   * Legal-page STRUCTURE (SITE-03). Only section HEADINGS live here — they are
   * STRUCTURE-parity-gated (`: Dict` + a runtime key-path test), so ar/en always
   * expose the same sections. Binding BODY text is deliberately NOT in this typed
   * dict: legal counsel may supply it Arabic-first, so it must be free to land
   * asymmetrically. Until then every section renders the shared `todoNote`
   * placeholder. `[[project_nabta_landing_site]]`.
   */
  legal: {
    draftBadge: "مسودة — قيد المراجعة القانونية",
    draftNote:
      "هذه الصفحة هيكلية فقط؛ سيُضيف الفريق القانوني النص الملزم لاحقًا. لا تعتمد عليها بعد.",
    placeholderIntro:
      "هذه نسخة مبدئية لأغراض الهيكلة. العناوين أدناه تحدد ما سيغطّيه المستند، بينما يُضاف النص الملزم لكل قسم لاحقًا.",
    todoNote: "TODO(legal): يضيف الفريق القانوني النص الملزم لهذا القسم.",
    contactHeading: "التواصل معنا",
    privacy: {
      sections: [
        {
          heading:
            "البيانات التي نجمعها: الهوية والتواصل (الهاتف أو البريد، الاسم، المدينة)",
        },
        { heading: "الجهاز والإشعارات (رموز FCM والمنصة)" },
        { heading: "الموقع والعناوين (الأماكن المحفوظة)" },
        { heading: "الطلبات وصور إيصالات الدفع" },
        {
          heading:
            "وسائط المستخدم (صور طبيب النبات بالذكاء الاصطناعي، مرفقات التواصل)",
        },
        { heading: "بيانات العناية بالنبات" },
        {
          heading:
            "أطراف ثالثة (FCM/Google، مُرسِل رموز التحقق عبر SMS أو البريد، وتخزين MinIO)",
        },
        { heading: "كيف نستخدم البيانات" },
        { heading: "الاحتفاظ بالبيانات" },
        { heading: "خصوصية الأطفال" },
        { heading: "حقوق المستخدم" },
      ],
    },
    terms: {
      sections: [
        { heading: "قبول الشروط" },
        { heading: "الحسابات" },
        { heading: "الاستخدام المقبول" },
        { heading: "الملكية الفكرية" },
        { heading: "إخلاء المسؤولية" },
        { heading: "حدود المسؤولية" },
        { heading: "القانون الحاكم" },
      ],
    },
  },
  /**
   * Site-chrome strings (LVR-03 Header rebuild). `langNavLabel` names the header's
   * language-switch `<nav>` landmark (the footer's legal `<nav>` is named by
   * `footer.legal`), so a screen-reader user can tell the two nav regions apart.
   * The toggle control itself takes NO aria-label — its accessible name is the
   * visible endonym (English / العربية), so accessible-name == visible-text and the
   * axe `label-content-name-mismatch` rule stays clean.
   */
  header: {
    langNavLabel: "تبديل اللغة",
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
