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
  marketing: {
    cta: {
      label: "Download the Nabta app",
      comingSoon: "Coming soon",
      ariaComingSoon: "Download the Nabta app coming soon, not available yet",
    },
    hero: {
      eyebrow: "The Nabta app",
      title: "Everything for your plants, in one place",
      subtitle:
        "Shop ornamental plants, get them delivered to your door, and keep them thriving — backed by experts and AI.",
      ctaSecondary: "See how it works",
      floatingChip: {
        label: "Watering reminder",
        value: "In 2 days",
      },
    },
    whatIs: {
      eyebrow: "Get to know Nabta",
      heading: "What is Nabta?",
      body1:
        "Nabta is an app for buying plants — but it's more than a store. It's a bond between you and your plants, backed by experts and a smart assistant. Browse ornamental plants, get suggestions tailored to your experience and your home, then order and have them delivered to your door.",
      body2:
        "After you buy, each plant joins your care list, with watering and fertilizing reminders. When something looks wrong, ask an expert or get an AI-assisted answer.",
    },
    features: {
      eyebrow: "Features",
      heading: "Why Nabta?",
      subheading:
        "Everything you need to own and care for plants in a single app.",
      items: [
        {
          title: "Ornamental plant store",
          body: "Browse ornamental plants with clear prices in Syrian pounds, and search by local, scientific, or English name.",
        },
        {
          title: "Smart suggester",
          body: "Not sure which plant suits you? Answer a few questions about space, light, watering, and your experience, and Nabta suggests a curated shortlist.",
        },
        {
          title: "Plant care manager",
          body: "Every plant you own gets a care list with watering and fertilizing schedules, plus reminders that reach you on time — so your plants stay healthy.",
        },
        {
          title: "AI plant doctor",
          body: "Send a photo and a question about an ailing plant; the AI drafts an answer, and a care expert reviews it before it reaches you — trusted advice, not guesswork.",
        },
        {
          title: "Delivery & flexible payment",
          body: "Order plants to your door and pay your way — cash on delivery, or bank transfer with an uploaded receipt.",
        },
        {
          title: "Arabic-first experience",
          body: "A full right-to-left Arabic interface, with an English toggle and prices always in Syrian pounds.",
        },
      ],
    },
    screenshots: {
      heading: "A look inside the app",
      subheading: "Snapshots from the Nabta experience.",
      placeholderBadge: "Placeholder image",
      shots: [
        {
          alt: "Illustrative screenshot of the Nabta plant store: ornamental-plant cards with prices in Syrian pounds",
          caption: "Browse the store",
          body: "Browse ornamental plants with clear prices in Syrian pounds, and search by local, scientific, or English name — the same catalog, inside the app.",
        },
        {
          alt: "Illustrative screenshot of the Nabta smart suggester: short questions that suggest a suitable plant",
          caption: "Smart suggester",
          body: "Answer a few questions about space, light, watering, and your experience, and the app suggests plants that suit you.",
        },
        {
          alt: "Illustrative screenshot of the Nabta care & reminders screen: watering and fertilizing schedule per plant",
          caption: "Care & reminders",
          body: "Track watering and fertilizing schedules for every plant you own, with reminders that reach you on time so your plants stay healthy.",
        },
      ],
    },
    stats: {
      heading: "Nabta by the numbers",
      subheading: "What the Nabta app brings you — facts, not promises.",
      items: [
        { label: "reasons to choose Nabta" },
        { label: "ways to care for your plants" },
        { label: "languages, Arabic-first" },
      ],
    },
    testimonials: {
      heading: "What our users say",
      subheading:
        "Placeholder quotes, replaced with real testimonials at launch.",
      placeholderBadge: "Placeholder testimonial",
      items: [
        {
          quote:
            "The smart suggester helped me pick my first houseplant, and it's still thriving thanks to the reminders.",
          name: "Sample user",
          role: "Beginner hobbyist",
        },
        {
          quote:
            "I love paying cash on delivery — and my plants arrived fast and intact.",
          name: "Sample user",
          role: "Customer",
        },
        {
          quote:
            "When my plant's leaves turned yellow I sent a photo and got advice reviewed by an expert — great service.",
          name: "Sample user",
          role: "Experienced hobbyist",
        },
      ],
    },
    faq: {
      eyebrow: "Questions & answers",
      heading: "Frequently asked questions",
      lead: "Answers to the most common questions about the Nabta app and how it works.",
      items: [
        {
          q: "Is the Nabta app available now?",
          a: "Not yet — it's launching soon. It'll arrive on Google Play first, then the App Store. Follow this page for updates.",
        },
        {
          q: "What can I buy on Nabta?",
          a: "Ornamental plants of all kinds, with clear descriptions and prices — and search by local, scientific, or English name.",
        },
        {
          q: "How does the smart suggester work?",
          a: "You answer a few questions about space, light, watering, and your experience, and the app suggests plants that suit you.",
        },
        {
          q: "My plant is sick — can Nabta help?",
          a: "Yes. Send a photo and a question through the plant doctor; the AI drafts an answer that a care expert reviews before it's sent to you.",
        },
        {
          q: "What payment methods are available?",
          a: "Cash on delivery is always available, plus bank transfer with an uploaded payment receipt the team reviews.",
        },
        {
          q: "Which language and currency does the app use?",
          a: "Arabic by default with an English toggle, and prices are always shown in Syrian pounds.",
        },
      ],
    },
    download: {
      heading: "Ready to bring your plants home?",
      body: "The Nabta app arrives on Google Play soon, with the App Store to follow. Bookmark this page and come back at launch.",
      note: "Coming soon on Google Play · App Store later",
      secondaryLabel: "Contact us",
    },
    contact: {
      heading: "Contact us",
      body: "Have a question or feedback? Email us and we'll get back to you. (No form — direct contact only.)",
      emailLabel: "Email",
      whatsappLabel: "WhatsApp",
      phoneLabel: "Phone",
    },
  },
  legal: {
    draftBadge: "DRAFT — pending legal review",
    draftNote:
      "This page is structure-only; the legal team will add the binding text later. Do not rely on it yet.",
    placeholderIntro:
      "This is a preliminary version for structuring purposes. The headings below define what the document will cover; the binding text for each section is added later.",
    todoNote:
      "TODO(legal): the legal team will add the binding text for this section.",
    contactHeading: "Contact us",
    privacy: {
      sections: [
        {
          heading:
            "Data we collect: identity & contact (phone or email, name, city)",
        },
        { heading: "Device & push (FCM tokens and platform)" },
        { heading: "Location & addresses (saved places)" },
        { heading: "Orders & payment-receipt images" },
        {
          heading:
            "User media (AI plant-doctor photos, contact-us attachments)",
        },
        { heading: "Plant-care data" },
        {
          heading:
            "Third parties (FCM/Google, the OTP SMS/email dispatcher, and MinIO storage)",
        },
        { heading: "How we use data" },
        { heading: "Data retention" },
        { heading: "Children's privacy" },
        { heading: "User rights" },
      ],
    },
    terms: {
      sections: [
        { heading: "Acceptance of terms" },
        { heading: "Accounts" },
        { heading: "Acceptable use" },
        { heading: "Intellectual property" },
        { heading: "Disclaimers" },
        { heading: "Limitation of liability" },
        { heading: "Governing law" },
      ],
    },
  },
  header: {
    langNavLabel: "Switch language",
    reduceMotion: "Reduce motion",
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
