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
- **Self-hosted fonts** — **Fraunces** (variable, Latin display) + **Tajawal** (Arabic
  display) + **Cairo** (body), all via `@fontsource*`, never a Google-Fonts CDN. (The two
  display faces were added in the LVR botanical redesign — see
  [decision 40](../nabta-docs/01-decisions/40-landing-botanical-motion-redesign.md).)
- Tests: **`node --test`** for the build smoke + `node` preview/link scripts (the LVR
  headless `astro:page-load` leg adds **`puppeteer-core`** as the only test dep). **No
  Vitest, no React, no shadcn, no Orval, no Zustand** — none of the admin's runtime stack.

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
removes any cookie-consent obligation, and is asserted by CI. The **generic same-origin
gate** is [`scripts/link-check.mjs`](scripts/link-check.mjs) (`npm run test:links` — every
internal link/resource resolves + zero third-party requests) **plus** the extended
[`test/build-smoke.test.mjs`](test/build-smoke.test.mjs) scan of bundled `dist/_astro/*.css`
for `url(http…)` / `@import` (LVR-01 — a CSS-level off-origin font/asset can't hide in the
HTML grep). The literal needle list (`fonts.googleapis.com` / `gtag(` / analytics hosts) is
only a **backstop**, not the primary gate. Adding analytics later is a **separate task with
consent UI** — it must not sneak in.

### SEO base (D-site-5)

[`src/components/BaseHead.astro`](src/components/BaseHead.astro) emits per-page title,
description, canonical, OG/Twitter, and reciprocal hreflang (`ar` + `en` + `x-default`→ar)
— **all absolute + base-prefixed**. `404.astro` is `noindex` (no pair → no hreflang).
`robots.txt` is a **generated endpoint** ([`src/pages/robots.txt.ts`](src/pages/robots.txt.ts)),
not a static file, so its absolute Sitemap URL derives from the one config source.

### Motion + page transitions (D-site-6 — LVR botanical redesign)

**JS + motion are in-scope.** The owner lifted the original **zero-JS / no-View-Transitions**
stance ([decision 40](../nabta-docs/01-decisions/40-landing-botanical-motion-redesign.md)). The
site now ships **bounded, first-party** runtime JS — no third party, still a11y/bp=100:

- **Page transitions:** Astro `<ClientRouter />` in [`src/layouts/Base.astro`](src/layouts/Base.astro)
  — a **fade only**, never a directional page slide. **Do NOT `transition:persist`** the Header
  across the ar↔en toggle (a persisted RTL header / wrong-face Wordmark on an LTR page is THE
  regression); `<html dir|lang>` are re-derived per swap.
- **Scroll-reveal:** [`src/scripts/reveal.ts`](src/scripts/reveal.ts) + count-up
  [`src/scripts/count-up.ts`](src/scripts/count-up.ts) use an `IntersectionObserver` and
  **register on `document` `astro:page-load`** (NOT a once-only `DOMContentLoaded`), so reveals
  re-fire after every ClientRouter swap. The reveal "from" state is **JS-applied** (a
  `data-motion-ready` root) — **never** a static `[data-reveal]{opacity:0}` in CSS, so a no-JS /
  failed-script render leaves content visible.
- **Ambient motion:** CSS-only `AmbientBackdrop` (out-of-flow, `pointer-events:none`); every
  motif/icon `<svg>` is `aria-hidden` + intrinsic-dimensioned.
- **`prefers-reduced-motion`:** a reduce-motion block neutralises transforms/animations; the LCP
  hero `<h1>` is **always opaque at first paint** (stagger non-LCP siblings — never `opacity:0`
  on the h1).
- **RTL motion:** horizontal reveals slide from the logical start via `--slide-from` (driven by
  `[dir]`), so nothing slides the wrong way under RTL. `rtl-logical` structurally can't catch
  motion direction, so it has its **own** gate: [`test/motion-a11y.test.mjs`](test/motion-a11y.test.mjs)
  (R1–R7 source-scan: GPU-only props, no literal-sign `translateX` outside `var(--slide-from)`,
  no static reveal-hide, reduce-motion block exists, scripts register on `astro:page-load`, …)
  plus the headless `astro:page-load` runtime leg in
  [`scripts/preview-smoke.mjs`](scripts/preview-smoke.mjs) (`puppeteer-core`).
- **Firm bounds (unchanged):** Lighthouse **a11y + best-practices = 100**, **zero third-party
  requests**, RTL correctness, and ar/en chrome-string parity stay hard gates.

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
  is internet-less and is **not** a host here (decision 34 D4).
- **Canonical live URL: `https://ahmadjz.github.io/nabta-web-landing/`** (privacy at
  `…/privacy`, terms at `…/terms`). A **custom domain later** flips `base` → `/` in
  [`astro.config.mjs`](astro.config.mjs) — nothing else changes (everything funnels
  through `site`/`base` + [`src/lib/base.ts`](src/lib/base.ts)).
- **Deploy (SITE-05):** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
  on push to `main` — `astro build` → `actions/upload-pages-artifact@v3` (`dist/`) →
  `actions/deploy-pages@v5`, with `permissions: { contents: read, pages: write,
  id-token: write }`, `environment: github-pages`, and `concurrency: pages`
  (`cancel-in-progress: false`). Quality is gated separately by `ci.yml` in parallel.
  `public/.nojekyll` (shipped to `dist/`) keeps Pages from dropping `_astro/`.
- **Human-gated, one-time** (the agent cannot self-apply): repo **public** + **Settings
  → Pages → Source = "GitHub Actions"**. `deploy-pages` fails with "Get Pages site
  failed" until that toggle lands.
- **Play-Store submission gate:** the privacy URL stays **blocked** for Play submission
  until [`src/config/legal.ts`](src/config/legal.ts) `LEGAL_IS_DRAFT` is cleared (binding
  legal text landed — SITE-03). The URL is a **stable contract** either way.
- **Runbook:** [`DEPLOY.md`](DEPLOY.md) — redeploy (push `main` or `gh workflow run`),
  verify (`curl` matrix), one-time setup, troubleshooting, custom-domain steps.

## Phase / roadmap

Tasks (initial build): [../nabta-docs/08-roadmap/tasks/done/landing-marketing-site/](../nabta-docs/08-roadmap/tasks/done/landing-marketing-site/)
(prefix `SITE-`). **SITE-01** = the scaffold; then marketing landing (02), legal
placeholder pages (03), SEO/a11y/Lighthouse polish (04), GitHub Pages deploy +
public-URL verify (05), reconciliation (06).

Botanical + motion redesign: [../nabta-docs/08-roadmap/tasks/done/landing-visual-refresh/](../nabta-docs/08-roadmap/tasks/done/landing-visual-refresh/)
(prefix `LVR-`) — design tokens/typography (01), primitives + motion machinery (02),
ClientRouter + header/footer (03), section rebuilds (04–07), legal/404 restyle (08),
motion-a11y/RTL gate (09), deploy + live verify (10), reconciliation (11). Reverses the
zero-JS stance — [decision 40](../nabta-docs/01-decisions/40-landing-botanical-motion-redesign.md).

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
