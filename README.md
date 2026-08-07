# nabta-web-landing

The public, static, bilingual (Arabic-default + RTL / English) **landing /
marketing / legal** site for **Nabta** — built with **Astro + Tailwind v4**,
published on the **Nabta VPS**. It hosts the publicly-reachable **privacy-policy +
terms** URLs required by Google Play / the App Store.

It is a standalone, decoupled site: **no login, no API, no analytics, no cookies,
zero third-party requests.** It shares only the green brand tokens + the ar-default
i18n philosophy with `nabta-web-admin`.

**Look & motion.** A botanical-editorial redesign on self-hosted display type
(**Fraunces** Latin / **Tajawal** Arabic, **Cairo** body) over the brand green +
sage/cream/clay/ink palette. Motion is in-scope: Astro **`ClientRouter`** fade page
transitions, scroll-reveal sections, and an ambient hero motif — all bounded by the
firm gates (**Lighthouse a11y + best-practices = 100**, zero third-party requests,
full RTL mirroring, ar/en parity) and fully collapsed to instant content under
**`prefers-reduced-motion`**.

- **Canonical URL:** `https://nabteh.app/`
- **Decision:** [`nabta-docs/01-decisions/34`](../nabta-docs/01-decisions/34-customer-web-landing-only.md)
- **Spec:** [`nabta-docs/04-features/landing-marketing-site.md`](../nabta-docs/04-features/landing-marketing-site.md)
- **Conventions for contributors / Claude:** [`CLAUDE.md`](CLAUDE.md)

## Getting started

```bash
npm install
npm run dev        # http://localhost:4321/  (root-served; does NOT honour the base path)
```

> ⚠️ The VPS production build lives at the root; the GitHub Pages fallback lives
> under `/nabta-web-landing/`. Use the matching build/test commands from
> [DEPLOY.md](DEPLOY.md), rather than trusting `astro dev`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server on `:4321` (root-served) |
| `npm run build` | GitHub Pages fallback build → static `dist/` |
| `npm run build:apex` | VPS root build → static `dist/` |
| `npm run preview` | Serve the built `dist/` **under the base path** |
| `npm run test` | GitHub Pages fallback tests (run after `build`) |
| `npm run test:apex` | VPS root tests (run after `build:apex`) |
| `npm run test:preview` | Boot `astro preview` + assert the sub-path contract |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --write .` |

## Layout

```
src/
  config.ts              # non-URL constants (CONTACT_EMAIL, PLAY_STORE_URL)
  lib/base.ts            # withBase() / absoluteUrl() — the ONLY way to build URLs
  i18n/
    ar.ts en.ts index.ts # typed dictionary (ar = source of truth, en parity-checked)
    page-pairs.ts        # the one ar↔en map → language toggle + hreflang
  layouts/Base.astro     # html shell, header + footer, skip link, fonts
  components/            # BaseHead (SEO), Header, Footer, LanguageToggle
  pages/
    index.astro          # ar home (/)
    en/index.astro       # en home (/en/)
    404.astro            # bilingual, noindex
    robots.txt.ts        # generated robots (absolute, base-prefixed Sitemap)
  styles/global.css      # Tailwind v4 @theme + brand tokens (snapshot)
public/
  favicon.svg  .nojekyll
test/build-smoke.test.mjs
scripts/preview-smoke.mjs
```

## Hosting

Published to the **Nabta VPS** by building the root artifact and rsyncing it to the
Caddy directory mount. GitHub Pages remains a temporary fallback, built by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on pushes to `main`.

- **Live URL:** `https://nabteh.app/`
  (privacy: `…/privacy`, terms: `…/terms`).
- **One-time setup (human-gated):** the repo must be **public** and **Settings →
  Pages → Source = "GitHub Actions"** — the workflow cannot self-enable Pages.
- **Fallback configuration:** `npm run build` keeps the Pages base; `npm run
  build:apex` uses the root base and apex canonical URL.

See **[`DEPLOY.md`](DEPLOY.md)** for the full deploy/redeploy/verify runbook.
