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
      ariaComingSoon: "حمّل تطبيق نبتة قريبًا، غير متاح بعد",
    },
    hero: {
      eyebrow: "تطبيق نبتة",
      title: "كل ما يخص نباتاتك في مكان واحد",
      subtitle:
        "تسوّق نباتات الزينة، واطلب توصيلها إلى بابك، وحافظ على نضارتها — بدعمٍ من الخبراء والذكاء الاصطناعي.",
      /** Ghost CTA next to the download button — scrolls to the explainer section. */
      ctaSecondary: "اكتشف كيف يعمل",
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
        "نبتة تطبيق لبيع النباتات، لكنه أكثر من مجرّد متجر: إنه رابطة بينك وبين نباتاتك يدعمها خبراء ومساعد ذكي. تصفّح نباتات الزينة، واحصل على اقتراحات تناسب خبرتك وظروف منزلك، ثم أكمل طلبك واستلمه عند بابك.",
      body2:
        "بعد الشراء تنضمّ كل نبتة إلى قائمة عنايتك مع تذكيرات الريّ والتسميد. وعند ظهور أي مشكلة، اسأل خبيرًا أو احصل على إجابة مدعومة بالذكاء الاصطناعي.",
    },
    features: {
      /** Clay kicker above the Features heading (editorial rhythm, LPV2-05). */
      eyebrow: "المزايا",
      heading: "لماذا نبتة؟",
      subheading: "كل ما تحتاجه لاقتناء النباتات والعناية بها في تطبيق واحد.",
      items: [
        {
          title: "متجر نباتات الزينة",
          body: "تصفّح نباتات الزينة بأسعار واضحة بالليرة السورية، وابحث بالاسم المحلي أو العلمي أو الإنجليزي.",
        },
        {
          title: "المساعد الذكي للاختيار",
          body: "لا تعرف أي نبتة تناسبك؟ أجب عن بضعة أسئلة حول المساحة والإضاءة والريّ وخبرتك، فتقترح لك نبتة قائمة مختارة تناسبك.",
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
          body: "اطلب نباتاتك إلى بابك وادفع كما يناسبك — نقدًا عند الاستلام أو بتحويل بنكي مع رفع إيصال الدفع.",
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
          alt: "صورة توضيحية لشاشة متجر النباتات في تطبيق نبتة: بطاقات نباتات زينة بأسعار بالليرة السورية",
          caption: "تصفّح المتجر",
          body: "تصفّح نباتات الزينة بأسعار واضحة بالليرة السورية، وابحث بالاسم المحلي أو العلمي أو الإنجليزي — المتجر نفسه، من داخل التطبيق.",
        },
        {
          alt: "صورة توضيحية لشاشة المساعد الذكي في تطبيق نبتة: أسئلة قصيرة تقترح نبتة مناسبة",
          caption: "المساعد الذكي",
          body: "أجب عن بضعة أسئلة حول المساحة والإضاءة والريّ وخبرتك، فيقترح لك التطبيق نباتات تناسبك.",
        },
        {
          alt: "صورة توضيحية لشاشة العناية والتذكيرات في تطبيق نبتة: مواعيد ريّ وتسميد لكل نبتة",
          caption: "العناية والتذكيرات",
          body: "تابع مواعيد الريّ والتسميد لكل نبتة تمتلكها، مع تذكيرات تصلك في وقتها لتبقى نباتاتك بصحة جيدة.",
        },
      ],
    },
    /**
     * Impact-stats band (LPV2-05) — the ONLY genuinely-new marketing section. The
     * display NUMBERS live OUT of the dict in a non-translated tuple
     * (`sections/stats.ts` `STATS`, index-mapped like feature-icons.ts); only the
     * `label` is translated. FIXED item count both locales (`items.length ===
     * STATS.length`). HONEST verifiable facts only (see stats.ts / Decisions) —
     * never fabricated user metrics.
     */
    stats: {
      heading: "نبتة بالأرقام",
      subheading: "ما يقدّمه لك تطبيق نبتة — حقائق لا وعود.",
      items: [
        { label: "أسباب تجعل نبتة اختيارك" },
        { label: "طرق للاعتناء بنباتاتك" },
        { label: "لغتان، والعربية أولًا" },
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
            "يعجبني الدفع نقدًا عند الاستلام، وقد وصلت نباتاتي بسرعة وسليمة.",
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
      /** Clay kicker above the FAQ heading (LVR-07 two-col editorial). */
      eyebrow: "أسئلة وأجوبة",
      heading: "الأسئلة الشائعة",
      /** Supporting lead beside the sticky heading rail. */
      lead: "إجابات عن أكثر ما يُسأل حول تطبيق نبتة وطريقة عمله.",
      items: [
        {
          q: "هل تطبيق نبتة متاح الآن؟",
          a: "ليس بعد — التطبيق قيد الإطلاق. سيصل إلى Google Play أولًا ثم App Store لاحقًا. تابع هذه الصفحة للتحديثات.",
        },
        {
          q: "ماذا يمكنني أن أشتري من نبتة؟",
          a: "نباتات الزينة بأنواعها، مع وصف وأسعار واضحة — وبحث بالاسم المحلي أو العلمي أو الإنجليزي.",
        },
        {
          q: "كيف يعمل المساعد الذكي للاختيار؟",
          a: "تجيب عن بضعة أسئلة حول المساحة والإضاءة والريّ وخبرتك، فيقترح لك التطبيق نباتات مناسبة.",
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
      heading: "جاهز لتبدأ رحلتك مع النباتات؟",
      body: "يصل تطبيق نبتة إلى Google Play قريبًا، ويليه App Store. احفظ هذه الصفحة وعُد إليها عند الإطلاق.",
      note: "قريبًا على Google Play · App Store لاحقًا",
      /** Secondary CTA on the forest band — anchors to the contact section. */
      secondaryLabel: "تواصل معنا",
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
    /** Visible label on the motion-preference toggle button (LPV2-02). It is a
     *  toggle button: `aria-pressed` conveys on/off, the label stays constant. */
    reduceMotion: "تقليل الحركة",
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
