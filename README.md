# nabta-web-landing

The public, static, bilingual (Arabic-default + RTL / English) **landing /
marketing / legal** site for **Nabta** — built with **Astro + Tailwind v4**,
published to **GitHub Pages**. It hosts the publicly-reachable **privacy-policy +
terms** URLs required by Google Play / the App Store.

It is a standalone, decoupled site: **no login, no API, no analytics, no cookies,
zero third-party requests.** It shares only the green brand tokens + the ar-default
i18n philosophy with `nabta-web-admin`.

- **Canonical URL:** `https://ahmadjz.github.io/nabta-web-landing/`
- **Decision:** [`nabta-docs/01-decisions/34`](../nabta-docs/01-decisions/34-customer-web-landing-only.md)
- **Spec:** [`nabta-docs/04-features/landing-marketing-site.md`](../nabta-docs/04-features/landing-marketing-site.md)
- **Conventions for contributors / Claude:** [`CLAUDE.md`](CLAUDE.md)

## Getting started

```bash
npm install
npm run dev        # http://localhost:4321/  (root-served; does NOT honour the base path)
```

> ⚠️ `astro dev` serves at the root. The production site lives under the
> `/nabta-web-landing/` **sub-path**, which only `astro preview` honours. Always
> verify sub-path behaviour with `npm run build && npm run preview`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server on `:4321` (root-served) |
| `npm run build` | `astro build` → static `dist/` |
| `npm run preview` | Serve the built `dist/` **under the base path** |
| `npm run test` | `node --test` build smoke (run after `build`) |
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

Published to **GitHub Pages** (public HTTPS) by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`: `astro build` → `actions/upload-pages-artifact` (`dist/`) →
`actions/deploy-pages`. The interim dev VM is internet-less and does not host this
site.

- **Live URL:** `https://ahmadjz.github.io/nabta-web-landing/`
  (privacy: `…/privacy`, terms: `…/terms`).
- **One-time setup (human-gated):** the repo must be **public** and **Settings →
  Pages → Source = "GitHub Actions"** — the workflow cannot self-enable Pages.
- **Custom domain (later):** flip `base` → `/` in
  [`astro.config.mjs`](astro.config.mjs) and add the domain; nothing else changes
  because every URL funnels through `site`/`base` + `src/lib/base.ts`.
