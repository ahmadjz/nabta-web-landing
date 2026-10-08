# nabta-web-landing — Claude context

The Nabta public landing / marketing / legal site: a static, bilingual (ar-default + RTL, en) **Astro**
site. It is a marketing presence and the host of the publicly-reachable privacy-policy + terms URLs the
app stores require ([decision 34](../nabta-docs/01-decisions/34-customer-web-landing-only.md) ·
[spec](../nabta-docs/04-features/landing-marketing-site.md)). Not a web app — no login, API, `/v1` or
envelope — and it shares nothing with `nabta-web-admin` beyond the green brand tokens and the ar-default +
RTL philosophy. The palette re-tune and full motion design log live in
[../nabta-docs/nabta-web-landing-history.md](../nabta-docs/nabta-web-landing-history.md).

## Read these first

Shared rules live in [../nabta-docs/claude/rules/](../nabta-docs/claude/rules/):

- [Execution policy](../nabta-docs/claude/rules/execution-policy.md) — the session contract: local commits (no push), autonomy + safety floor, backend reaches the dev VM from a commit via /nabta-deploy. Gates: [repo-gates](../nabta-docs/claude/rules/repo-gates.md).
- [Commit style](../nabta-docs/claude/rules/commit-style.md) · [TDD workflow](../nabta-docs/claude/rules/tdd-workflow.md) · [Secret handling](../nabta-docs/claude/rules/secret-handling.md) · [Docs/memory rule](../nabta-docs/claude/rules/docs-memory-litmus.md)

## Stack

- Astro (`output: static`) + TypeScript — static HTML for SEO with the least machinery (decision 34 D2). Stale Tailwind-v3 / Astro-v4-i18n docs dominate web search; check a snippet against the config before following it.
- Tailwind v4 via `@tailwindcss/vite` in `astro.config.mjs` with no `tailwind.config.*`; the theme is `@theme` CSS variables in `src/styles/global.css`.
- `@astrojs/sitemap` plus a generated `robots.txt` endpoint (`src/pages/robots.txt.ts`), so both derive from the one URL config.
- Fonts are self-hosted via `@fontsource*` — Fraunces (Latin display), Tajawal (Arabic display), Cairo (body) — never a Google Fonts CDN.
- Tests are `node --test` + node preview/link scripts; `puppeteer-core` is the only test dep (the headless `astro:page-load` leg). None of the admin's runtime stack (no Vitest/React/shadcn/Orval/Zustand).

## URLs — sub-path strategy

- Canonical is `https://nabteh.app/`; GitHub Pages at `https://ahmadjz.github.io/nabta-web-landing/` is a temporary fallback. `site` + `base` are set once in `astro.config.mjs` (defaults = Pages; `npm run build:apex` supplies the apex values) and are the only URL source.
- Every internal link, asset, canonical, hreflang, OG url, sitemap `<loc>` and robots `Sitemap:` goes through `src/lib/base.ts` — `withBase(path)` for internal, `absoluteUrl(path)` for absolute — because a bare `/privacy` 404s on the project page.
- Audit with `astro preview`, which honours `base`; `astro dev` always serves at root. `scripts/preview-smoke.mjs` asserts the contract over HTTP (Pages rejects bare `/`, apex serves it).

## i18n + RTL

- Astro i18n with `defaultLocale: "ar"`, `locales: ["ar","en"]`, `routing.prefixDefaultLocale: false` set explicitly — Astro v6 changed the defaults — so ar is at `/`, en at `/en/`. `<html lang>`/`dir` come from an explicit per-page `locale` prop.
- `src/i18n/ar.ts` is the source of truth; `en.ts` is typed `: Dict`, so a missing or extra chrome key fails `npm run build`. Marketing/legal content parity is per page.
- `src/i18n/page-pairs.ts` feeds both the language toggle and the hreflang alternates, so an alternate can never dangle; `/privacy` + `/terms` are pinned there as stable contract URLs.
- Logical Tailwind utilities (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`) in place of `pl-`/`pr-`/`left-`/`right-`, matching the admin's discipline.

## Brand tokens

`src/styles/global.css` `@theme` snapshots only `--color-primary`, `--color-ring` and `--radius` from
`nabta-web-admin/src/globals.css` @ `62e5f96` — not the shadcn neutrals, `.dark` block or
`tw-animate-css`. If the admin re-tunes the green, re-snapshot and bump the SHA in the file header.
`test/contrast.test.mjs` locks `clay-700`-on-`cream` and `cream`-on-`primary-900` at ≥ 4.5:1, and
`primary`-on-`cream` sits at ≈ 4.53:1 — so `--color-primary` is frozen and `--color-cream` can't be darkened.

## Zero third-party requests

- The site collects nothing: no cookies, analytics or CDN fonts — no third-party requests at all — which keeps it out of its own privacy policy and clear of consent obligations. Gates: `scripts/link-check.mjs` (`npm run test:links`: every internal link resolves, zero off-origin requests) and `test/build-smoke.test.mjs`'s scan of `dist/_astro/*.css` for `url(http…)`/`@import`; the literal needle list (`fonts.googleapis.com`, `gtag(`) is only a backstop. Analytics later is a separate task with consent UI.
- Third-party *libraries* in the dist are banned with one scoped exception ([decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md)): `motion` (WAAPI-based), bundled same-origin for the hero-signature island (`src/scripts/hero-signature.ts`) and the magnetic CTA (`src/scripts/magnetic.ts`). `test/motion-a11y.test.mjs` holds the import allowlist (`motion`, `motion/mini`, `motion-dom`) — any other bare client import fails the build, and the allowlist must actually be exercised. Motion has no built-in reduced-motion, so each island early-returns static on `isEffectiveMotionOff()`.

## SEO

`src/components/BaseHead.astro` emits per-page title, description, canonical, OG/Twitter and reciprocal
hreflang (`ar` + `en` + `x-default`→ar), all absolute + base-prefixed. `404.astro` is `noindex` (no pair,
no hreflang).

## Motion + page transitions

JS and motion are in scope ([decision 40](../nabta-docs/01-decisions/40-landing-botanical-motion-redesign.md),
[decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md)) within firm
bounds: Lighthouse a11y + best-practices = 100, zero third-party requests, RTL correctness, ar/en chrome parity.

- Astro `<ClientRouter />` in `src/layouts/Base.astro` does a fade only, never a directional slide. The Header is not `transition:persist`ed across the ar↔en toggle — a persisted RTL header / wrong-face Wordmark on an LTR page was the regression; `<html dir|lang>` are re-derived per swap. Crossfades are named, on locale-invariant elements, with an `animation: none` fallback.
- Scripts (`reveal.ts`, `count-up.ts`, the islands) register on `document` `astro:page-load`, not `DOMContentLoaded`, so they re-fire after each swap, and tear down on `astro:before-swap`. The reveal "from" state is JS-applied via a `data-motion-ready` root, never a static `[data-reveal]{opacity:0}`, so a no-JS render stays visible. The LCP hero `<h1>` is always opaque at first paint — stagger its siblings instead.
- `src/scripts/motion-pref.ts` `isEffectiveMotionOff()` = OS `prefers-reduced-motion` OR the in-page toggle (`html[data-motion="off"]`, persisted in `localStorage["nabta-motion"]`, stamped pre-paint by an inline script). CSS-driven motion is neutralised by a CSS twin in `global.css` keyed on `html[data-motion="off"] *` with `!important` (a data-attr alone is inert on CSS motion); JS-driven motion reads the helper. Scroll-driven `animation-timeline` is progress-based and ignores duration collapse, so every such rule carries `animation-timeline: none !important` under both the media query and the toggle.
- Horizontal reveals slide from the logical start via `--slide-from` (driven by `[dir]`). Islands are `(pointer:fine)`-only, `aria-hidden`, `pointer-events:none` and off the LCP `<h1>`.
- `test/motion-a11y.test.mjs` owns the source-scan gates (R1–R8 + the LPV2 additions); the headless leg in `scripts/preview-smoke.mjs` proves OS-reduce and toggle-off make motion static independently, and fails rather than skips without Chrome (`REQUIRE_HEADLESS`).

## Tests

- `test/build-smoke.test.mjs` (`npm run test`, after a build): file checks on `dist/` — base-prefixed href/src, `404.html` + `.nojekyll`, absolute robots/sitemap, no third-party requests.
- `scripts/preview-smoke.mjs` (`npm run test:preview`): boots `astro preview` and asserts the sub-path contract over HTTP, plus the link-check and the headless motion leg.

## Hosting / deploy

- Canonical: `npm run build:apex`, run the `*:apex` gates, rsync `dist/` to `/srv/nabta/web-landing/dist/` on the VPS, served by Caddy. Runbook: [`DEPLOY.md`](DEPLOY.md).
- `.github/workflows/deploy.yml` still publishes the Pages fallback on push to `main`; it stays until the Play Console privacy URL points at the apex.
- The privacy URL is a stable contract but stays blocked for Play submission until `src/config/legal.ts` `LEGAL_IS_DRAFT` is cleared (binding legal text).
- Archived plans: [landing-marketing-site](../nabta-docs/08-roadmap/tasks/done/landing-marketing-site/) (`SITE-`), [landing-visual-refresh](../nabta-docs/08-roadmap/tasks/done/landing-visual-refresh/) (`LVR-`), [landing-polish-v2](../nabta-docs/08-roadmap/tasks/done/landing-polish-v2/) (`LPV2-`).

## Commands

```bash
npm run dev           # astro dev on :4321 — root-served, does NOT honour base; audit with preview
npm run build         # astro build → dist/   (build:apex for the VPS values)
npm run preview       # serve dist/ under the base path
npm run test          # node --test build smoke (after a build)
npm run test:preview  # boot astro preview + assert the sub-path contract
```
