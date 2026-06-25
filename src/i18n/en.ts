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
      ariaComingSoon: "Download the Nabta app — coming soon, not available yet",
    },
    hero: {
      eyebrow: "The Nabta app",
      title: "Everything for your plants, in one place",
      subtitle:
        "Shop ornamental plants, get them delivered to your door, and care for them with easy steps — backed by experts and AI.",
    },
    whatIs: {
      heading: "What is Nabta?",
      body1:
        "Nabta is an app for buying plants, but it's more than a store: it's a relationship between you and your plants, supported by experts and a smart assistant. Browse ornamental plants, get suggestions tailored to your experience and your home's conditions, then order and get them delivered with ease.",
      body2:
        "After you buy, each plant becomes an item in your care list with watering and fertilizing reminders, and you can ask an expert or get an AI-assisted answer whenever a problem appears.",
    },
    features: {
      heading: "Why Nabta?",
      subheading:
        "Everything you need to own and care for plants in a single app.",
      items: [
        {
          title: "Ornamental plant store",
          body: "Browse and shop a range of ornamental plants with clear prices in Syrian pounds, and search that matches local, scientific, and English names together.",
        },
        {
          title: "Smart suggester",
          body: "Not sure which plant suits you? Answer a few simple questions about space, light, watering needs, and your experience level, and let Nabta suggest a curated list.",
        },
        {
          title: "Plant care manager",
          body: "Every plant you own gets its own care list with watering and fertilizing schedules and reminders that reach you on time, so your plants stay healthy.",
        },
        {
          title: "AI plant doctor",
          body: "Send a photo and a question about a problem with your plant; the AI drafts an answer that a care expert reviews before it reaches you — trusted advice, not guesswork.",
        },
        {
          title: "Delivery & flexible payment",
          body: "Order your plants to your door and pay cash on delivery or by bank transfer with an uploaded receipt — payment methods the team manages flexibly.",
        },
        {
          title: "Arabic-first experience",
          body: "A full right-to-left Arabic interface with an English toggle, and prices always shown in Syrian pounds.",
        },
      ],
    },
    screenshots: {
      heading: "A look inside the app",
      subheading: "Snapshots from the Nabta experience.",
      placeholderBadge: "Placeholder image",
      shots: [
        {
          alt: "Placeholder screenshot: browsing the plant store in the Nabta app",
          caption: "Browse the store",
        },
        {
          alt: "Placeholder screenshot: the smart plant suggester",
          caption: "Smart suggester",
        },
        {
          alt: "Placeholder screenshot: the plant care list and reminders",
          caption: "Care & reminders",
        },
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
            "I love that I pay cash on delivery, and the delivery was fast and my plants arrived intact.",
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
      heading: "Frequently asked questions",
      items: [
        {
          q: "Is the Nabta app available now?",
          a: "The app is launching soon. It will be available to download on Google Play first, then on the App Store later. Follow this page for updates.",
        },
        {
          q: "What can I buy on Nabta?",
          a: "Ornamental plants of all kinds, with clear descriptions and prices and search that matches local, scientific, and English names.",
        },
        {
          q: "How does the smart suggester work?",
          a: "You answer a few simple questions about space, light, watering needs, and your experience level, and the app suggests a suitable list of plants.",
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
      heading: "Ready to get started with your plants?",
      body: "The Nabta app will be available on Google Play soon, followed by the App Store. Bookmark this page and come back at launch.",
      note: "Coming soon on Google Play · App Store later",
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
