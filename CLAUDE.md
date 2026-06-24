# nabta-web-landing — Claude context

The Nabta **public landing / marketing / legal** site: a static, bilingual
(ar-default + RTL / en) **Astro** site — the **7th** Nabta repo. It is a *reference
+ marketing* presence and, critically, the host of the **publicly-reachable
privacy-policy + terms URLs** that Google Play / the App Store require.

It is **not** a web app: no login, no API, no `/v1`, no envelope, no customer
e-commerce. It shares **none** of the `nabta-web-admin` SPA machinery — only the
green brand tokens and the ar-default + RTL i18n *philosophy*. Decision:
[decision 34](../nabta-docs/01-decisions/34-customer-web-landing-only.md); spec:
[landing-marketing-site](../nabta-docs/04-features/landing-marketing-site.md).

## Read these first

Shared rules live in [../nabta-docs/claude/rules/](../nabta-docs/claude/rules/):

- [Commit style](../nabta-docs/claude/rules/commit-style.md) — Conventional Commits.
- [TDD workflow](../nabta-docs/claude/rules/tdd-workflow.md) — coverage is a signal, not a gate.
- [Secret handling](../nabta-docs/claude/rules/secret-handling.md).
- [Auto-memory policy](../nabta-docs/claude/rules/auto-memory-policy.md).

## Stack

- **Astro 7** (`output: static`) + **TypeScript**. Static-generated HTML for best SEO
  with the least machinery (the deciding factor over a SPA per decision 34 D2).
- **Tailwind v4** via the **`@tailwindcss/vite`** plugin in `astro.config.mjs` — there
  is **NO `tailwind.config.*`**; the theme lives in
  [`src/styles/global.css`](src/styles/global.css) as `@theme` CSS variables.
- **`@astrojs/sitemap`** for `sitemap-*.xml`; a generated `robots.txt` endpoint.
- **Self-hosted fonts** (`@fontsource/cairo`, Arabic + Latin) — never a Google-Fonts CDN.
- Tests: **`node --test`** (zero extra deps) for the build smoke + a `node` preview
  script. **No Vitest, no React, no shadcn, no Orval, no Zustand** — this site has none
  of the admin's runtime stack.

## Load-bearing decisions (SITE-01 scaffold)

Stale Tailwind-v3 / Astro-v4-i18n docs dominate web search — do **not** follow them.

### Sub-path URL strategy (the spine — D-site-1)

GitHub Pages **project pages** serve under a **sub-path**, not the domain root. The
canonical public URL is **`https://ahmadjz.github.io/nabta-web-landing/`**.

- `site` + `base` are set **once** in [`astro.config.mjs`](astro.config.mjs)
  (`site: "https://ahmadjz.github.io"`, `base: "/nabta-web-landing/"`). They are the
  **only** place those literals live.
- **Every** internal link / asset / canonical / hreflang / OG `url` / sitemap `<loc>` /
  robots `Sitemap:` derives from them via the helpers in
  [`src/lib/base.ts`](src/lib/base.ts): **`withBase(path)`** (internal, base-prefixed) and
  **`absoluteUrl(path)`** (absolute, base-prefixed). **Never emit a bare `/privacy`** — it
  404s on a project page. `src/lib/base.ts` reads `import.meta.env.{SITE,BASE_URL}`, so
  there is no second copy of the URL.
- **Audit with `astro preview`, NOT `astro dev`.** `dev` serves at root and would pass
  while production 404s; `preview` honours `base`. The proof check
  (`bare / → 404`) lives in [`scripts/preview-smoke.mjs`](scripts/preview-smoke.mjs).
- **A future custom domain flips `base` back to `/`** — and nothing else changes, because
  everything funnels through the two helpers + the one config source.

### i18n + RTL (D-site-2)

- Astro `i18n`: **`defaultLocale: "ar"`, `locales: ["ar","en"]`,
  `routing.prefixDefaultLocale: false`** → ar at `/`, en at `/en/`. **Astro v6+ changed
  the i18n routing defaults**, so these are set **explicitly** and must stay that way.
- `<html lang>` / `dir` are set **per page** from an explicit `locale` prop (ar = `rtl`),
  not inferred — deterministic.
- **Typed dictionary**: [`src/i18n/ar.ts`](src/i18n/ar.ts) is the source of truth;
  [`src/i18n/en.ts`](src/i18n/en.ts) is typed `: Dict` so a missing/extra key **fails
  `npm run build`** (compile-time chrome-string parity). Marketing/legal *content* parity
  is per-page (SITE-02/03), not here.
- **One page-pair map** [`src/i18n/page-pairs.ts`](src/i18n/page-pairs.ts) feeds **both**
  the language toggle **and** the hreflang alternates, so an alternate can never dangle.
  `/privacy` + `/terms` are pinned here now (stable contract URLs); SITE-03 only appends
  rows + builds the page files.
- **RTL styling**: use Tailwind **logical** utilities (`ps-`/`pe-`, `ms-`/`me-`,
  `start-`/`end-`) — never `pl-`/`pr-`/`left-`/`right-`. Mirror the admin's discipline.

### Brand tokens — snapshot, not a dependency (D-site-3)

[`src/styles/global.css`](src/styles/global.css) `@theme` copies **only** the brand
green (`--color-primary`), the focus ring (`--color-ring`), and the radius (`--radius`)
from **`nabta-web-admin/src/globals.css` @ commit `62e5f96`**. Deliberately **NOT**
copied: the shadcn neutral token set, the `.dark` block, `tw-animate-css`. If the admin
re-tunes the green, re-snapshot and bump the SHA in that file's header comment.

### Zero third-party requests (D-site-4)

The **site itself collects nothing**: no cookies, no analytics, no Google-Fonts CDN —
**no third-party requests at all**. This keeps the site out of its own privacy policy,
removes any cookie-consent obligation, and is asserted by a CI check (the smoke test
greps `dist/**` for `fonts.googleapis.com` / `gtag(` / analytics hosts). Adding analytics
later is a **separate task with consent UI** — it must not sneak in.

### SEO base (D-site-5)

[`src/components/BaseHead.astro`](src/components/BaseHead.astro) emits per-page title,
description, canonical, OG/Twitter, and reciprocal hreflang (`ar` + `en` + `x-default`→ar)
— **all absolute + base-prefixed**. `404.astro` is `noindex` (no pair → no hreflang).
`robots.txt` is a **generated endpoint** ([`src/pages/robots.txt.ts`](src/pages/robots.txt.ts)),
not a static file, so its absolute Sitemap URL derives from the one config source.

## Tests (SITE-01)

- [`test/build-smoke.test.mjs`](test/build-smoke.test.mjs) (`npm run test`, after a build):
  pure file checks on `dist/` — base-prefixed href/src, `404.html` + `.nojekyll` present,
  absolute base-prefixed robots/sitemap, no third-party requests.
- [`scripts/preview-smoke.mjs`](scripts/preview-smoke.mjs) (`npm run test:preview`): boots
  `astro preview` and asserts the sub-path contract over HTTP (incl. `bare / → 404`).
  **This is the harness SITE-02/03 extend** with an internal link-check + Lighthouse.

## Conventions

- Branch from `main`. [Conventional Commits](../nabta-docs/claude/rules/commit-style.md),
  imperative subject, no ticket refs. **Never** include `Co-Authored-By: Claude` or any AI
  mention in commits or PRs.
- **Same-repo, scoped commits.** After this scaffold, later SITE tasks commit only their
  own files (`git commit --only -- <paths>`); never sweep unrelated pending work.
- Tests-first for non-trivial logic; coverage is a signal, not a gate.

## Hosting / deploy

- **GitHub Pages** (public HTTPS) — the URL submitted to Google Play. The interim dev VM
  is internet-less and is **not** a host here (decision 34 D4). SITE-05 wires the Pages
  publish + has a **human-gated** repo-settings handoff (repo public + Pages source =
  GitHub Actions). `public/.nojekyll` keeps Pages from dropping `_astro/`.

## Phase / roadmap

Tasks: [../nabta-docs/08-roadmap/tasks/landing-marketing-site/](../nabta-docs/08-roadmap/tasks/landing-marketing-site/)
(prefix `SITE-`). **SITE-01** = this scaffold; then marketing landing (02), legal
placeholder pages (03), SEO/a11y/Lighthouse polish (04), GitHub Pages deploy +
public-URL verify (05), reconciliation (06).

## Commands

```bash
npm run dev           # astro dev on :4321 (root-served — does NOT honour base; audit with preview)
npm run build         # astro build → dist/
npm run preview       # serve the built dist/ UNDER the base path
npm run test          # node --test (build smoke; run after build)
npm run test:preview  # boot astro preview + assert the sub-path contract
npm run lint          # eslint .
npm run format        # prettier --write .
```
