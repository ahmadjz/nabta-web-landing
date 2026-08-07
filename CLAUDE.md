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

- [Execution policy](../nabta-docs/claude/rules/execution-policy.md) — the task-session contract: claims/lease, deferred commits (never commit mid-work), reviewer pass before a task flips ✅, RED-ahead specs land skipped, backend deploys via /nabta-deploy from a committed SHA. Read it before executing any planned task.
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

The canonical public URL is **`https://nabteh.app/`** on the VPS. GitHub Pages
remains a temporary fallback under its project sub-path
**`https://ahmadjz.github.io/nabta-web-landing/`**.

- `site` + `base` are set **once** in [`astro.config.mjs`](astro.config.mjs). Their
  defaults are the Pages fallback (`https://ahmadjz.github.io` +
  `/nabta-web-landing/`); `npm run build:apex` supplies the VPS canonical values
  (`https://nabteh.app` + `/`). They are the only URL configuration source.
- **Every** internal link / asset / canonical / hreflang / OG `url` / sitemap `<loc>` /
  robots `Sitemap:` derives from them via the helpers in
  [`src/lib/base.ts`](src/lib/base.ts): **`withBase(path)`** (internal, base-prefixed) and
  **`absoluteUrl(path)`** (absolute, base-prefixed). **Never emit a bare `/privacy`** — it
  404s on a project page. `src/lib/base.ts` reads `import.meta.env.{SITE,BASE_URL}`, so
  there is no second copy of the URL.
- **Audit with `astro preview`, NOT `astro dev`.** `dev` always serves at root; preview
  honours the selected base. [`scripts/preview-smoke.mjs`](scripts/preview-smoke.mjs)
  asserts Pages rejects bare `/` and the apex mode serves it.

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

**Palette re-tune (LPV2-01, [decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md)):** the botanical sage/cream/clay/ink scales were
re-tuned for a fresher v2 look (chroma enriched, dark shades deepened, cream a hair
warmer) with **token names unchanged** and **`--color-primary`/`--color-ring` kept
byte-identical** to the `62e5f96` snapshot — only the derived scales moved. Contrast is
re-verified by [`test/contrast.test.mjs`](test/contrast.test.mjs) (a correct
OKLCH→OKLab→linear-sRGB→WCAG-luminance calc) with Lighthouse a11y=100 as the authority;
two pairs are **locked ≥ 4.5:1** — `clay-700`-on-`cream` (Eyebrow) and
`cream`-on-`primary-900` (forest CTA band) — and `primary`-on-`cream` ≈ 4.53:1 is
razor-thin, so **`--color-primary` is frozen and `--color-cream` may never be darkened**.

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

**Third-party *libs* in the dist — banned, with ONE scoped exception ([decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md)).**
The zero-**request** rule above is absolute; the earlier blanket "no third-party libs in the
shipped `dist` JS" is **lifted for exactly one library — `motion` (Motion, WAAPI-based)** —
for the signature-motion island only ([`src/scripts/hero-signature.ts`](src/scripts/hero-signature.ts)
+ the reused spring in [`src/scripts/magnetic.ts`](src/scripts/magnetic.ts)). It stays
**bundled same-origin** into `/_astro/*` (so **zero third-party requests still holds** — the
gates above are unchanged). The lift's teeth: a `motion`-**only import allowlist** in
[`test/motion-a11y.test.mjs`](test/motion-a11y.test.mjs) (`MOTION_ALLOW = {"motion",
"motion/mini", "motion-dom"}`) — the **only** bare/third-party client import allowed; **any
other re-opens the ban** (build fails), and the allowlist must be *exercised* (the island is
wired). ⚠️ Motion has **no built-in reduced-motion**, so each island must manually
early-return static on `isEffectiveMotionOff()` (see the motion subsection). Widening the
allowlist is a deliberate future decision, not drift.

### SEO base (D-site-5)

[`src/components/BaseHead.astro`](src/components/BaseHead.astro) emits per-page title,
description, canonical, OG/Twitter, and reciprocal hreflang (`ar` + `en` + `x-default`→ar)
— **all absolute + base-prefixed**. `404.astro` is `noindex` (no pair → no hreflang).
`robots.txt` is a **generated endpoint** ([`src/pages/robots.txt.ts`](src/pages/robots.txt.ts)),
not a static file, so its absolute Sitemap URL derives from the one config source.

### Motion + page transitions (D-site-6 — LVR botanical redesign + LPV2 v2 polish)

**JS + motion are in-scope.** The owner lifted the original **zero-JS / no-View-Transitions**
stance ([decision 40](../nabta-docs/01-decisions/40-landing-botanical-motion-redesign.md)); the
**LPV2 v2 polish** ([decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md))
then added scroll-driven anims, a view-transition crossfade, an in-page motion toggle, and the
**one bundled `motion` island** (see D-site-4). The site ships **bounded** runtime JS — still
**zero third-party requests**, still a11y/bp=100 — first-party everywhere **except** the single
allowlisted `motion` island:

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
- **Motion-preference toggle + effective-motion signal (LPV2):**
  [`src/scripts/motion-pref.ts`](src/scripts/motion-pref.ts) exports `isEffectiveMotionOff()`
  = OS `prefers-reduced-motion:reduce` **OR** the in-page toggle (`html[data-motion="off"]`),
  persisted in `localStorage["nabta-motion"]` and stamped **pre-paint** by an inline
  `<script is:inline>` in `Base.astro` (no flash), re-applied per `astro:page-load`. **Two
  consumers, two mechanisms:** CSS-driven motion (reveal/ambient/scroll) is neutralised by a
  **CSS twin** in `global.css` keyed on `html[data-motion="off"] *` mirroring the `@media
  reduce` block with `!important` (a JS data-attr alone is inert on CSS motion; `!important`
  beats `AmbientBackdrop`'s inline duration); JS-driven motion (count-up + the islands) reads
  the JS helper.
- **CSS scroll-driven entrances + parallax (LPV2):** `animation-timeline: view()/scroll()`,
  transform/opacity only. `animation-timeline` is **progress-based** — the duration-collapse
  blocks do NOT stop it — so every scroll-timeline rule carries an explicit
  `animation-timeline: none !important` under **BOTH** `@media (prefers-reduced-motion:reduce)`
  **AND** `html[data-motion="off"]` (a silent-violation trap; **R8** asserts both forms).
- **View-transition crossfade (LPV2):** a **named** crossfade on a **locale-invariant**
  element (never Header/Wordmark — a persisted wrong-face/dir header is the H6 regression),
  with a reduce-motion + toggle `animation:none` fallback.
- **The one `motion` island (LPV2, [decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md)):**
  the pointer-reactive hero foliage ([`src/scripts/hero-signature.ts`](src/scripts/hero-signature.ts))
  + magnetic primary CTA ([`src/scripts/magnetic.ts`](src/scripts/magnetic.ts)) use the bundled
  `motion` lib (see D-site-4's allowlist). Motion has **no** built-in reduced-motion, so each
  island **early-returns static on `isEffectiveMotionOff()`**, is `(pointer:fine)`-only, keeps
  its layers `aria-hidden`/`pointer-events:none`/off the LCP `<h1>`, and **tears down** its
  listeners + `.stop()`s its animation on `astro:before-swap`.
- **`prefers-reduced-motion`:** a reduce-motion block neutralises transforms/animations; the LCP
  hero `<h1>` is **always opaque at first paint** (stagger non-LCP siblings — never `opacity:0`
  on the h1).
- **RTL motion:** horizontal reveals slide from the logical start via `--slide-from` (driven by
  `[dir]`), so nothing slides the wrong way under RTL. `rtl-logical` structurally can't catch
  motion direction, so it has its **own** gate: [`test/motion-a11y.test.mjs`](test/motion-a11y.test.mjs).
  Its source-scan owns **R1–R8** (GPU-only props, no literal-sign `translateX` outside
  `var(--slide-from)`, no static reveal-hide, reduce-motion block exists, scripts register on
  `astro:page-load`, …) **plus the LPV2 gate** (LPV2-08): the `motion`-only import allowlist,
  the **R1-twin** `html[data-motion="off"]` duration-collapse, **R8** dual-neutralised
  scroll-timeline, the view-transition fallback, each island's effective-motion guard +
  `pointer:fine` + `astro:before-swap` teardown, and count-up honesty. The headless
  `astro:page-load` runtime leg in [`scripts/preview-smoke.mjs`](scripts/preview-smoke.mjs)
  (`puppeteer-core`) proves OS-reduce **and** toggle-off make motion static **independently**,
  persistence across reload+swap, LCP-is-h1, coarse-pointer no-op — and **fails, not silently
  skips**, when CI has no Chrome (`REQUIRE_HEADLESS`).
- **Firm bounds (unchanged):** Lighthouse **a11y + best-practices = 100**, **zero third-party
  requests**, RTL correctness, and ar/en chrome-string parity stay hard gates. The one bundled
  `motion` island (D-site-4) does **not** relax any of them.

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

- **VPS static site** (public HTTPS) — the canonical deployment is
  `https://nabteh.app/` (privacy at `…/privacy`, terms at `…/terms`). Build with
  `npm run build:apex`, run the `*:apex` gates, rsync `dist/` to
  `/srv/nabta/web-landing/dist/`, and serve it through Caddy's directory mount.
- **GitHub Pages fallback:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
  still builds the default project-path artifact on push to `main`. Keep it only until
  the Play Console privacy URL is updated to the apex and the fallback can be retired.
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

Polish v2 (a11y + motion + visual upgrade): [../nabta-docs/08-roadmap/tasks/done/landing-polish-v2/](../nabta-docs/08-roadmap/tasks/done/landing-polish-v2/)
(prefix `LPV2-`) — palette/token re-tune + contrast gate (01), web-design-guidelines a11y +
the motion-preference toggle (02), the signature `motion` island (03), scroll choreography +
view-transition + magnetic CTA (04), showcase/impact-stats (05), conversion sections (06),
copy pass (07), the motion-a11y verification gate (08), deploy + live verify (09),
reconciliation (10). The scoped `motion` ban-lift + palette re-tune —
[decision 42](../nabta-docs/01-decisions/42-landing-scoped-motion-lib-and-v2-polish.md).

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
