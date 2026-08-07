# Deploy runbook — nabta-web-landing

How this static site reaches production on the **Nabta VPS**, how to redeploy it,
and how to verify it. GitHub Pages remains a temporary fallback while the former
Play Console URL is migrated.

## Live URL

- **Site:** `https://nabteh.app/`
- **Privacy:** `https://nabteh.app/privacy/` (the URL for Play Console)
- **Terms:** `https://nabteh.app/terms/`
- English mirror under `/en/` (e.g. `https://nabteh.app/en/privacy/`).

> The VPS build uses root base `/`; the GitHub Pages fallback keeps its project base
> `/nabta-web-landing/`. `astro` emits directory-style pages, so `…/privacy`
> redirects to `…/privacy/`; always `curl -L`.

## Production deploy (VPS)

Build and prove the apex artifact locally, then ship it into Caddy's directory
mount. The directory mount makes content updates live immediately; changing the
Caddyfile or compose mount still requires a Caddy recreate.

```bash
cd nabta-web-landing
npm run build:apex
npm run test:apex
npm run test:preview:apex
npm run test:links:apex

BOX=nabta-admin@31.97.45.116
rsync -a --delete dist/ "$BOX:/srv/nabta/web-landing/dist/"
```

Verify before announcing a deploy:

```bash
BASE=https://nabteh.app
for p in / /privacy/ /terms/ /en/ /en/privacy/ /en/terms/; do
  echo "$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$p")  $BASE$p"
done
curl -sSfL "$BASE/" | grep -o '<title>[^<]*</title>'
curl -sSfL "$BASE/robots.txt" | grep '^Sitemap:'
```

## GitHub Pages fallback

`deploy.yml` runs on **every push to `main`** (and via manual **Run workflow** /
`workflow_dispatch`). Two jobs:

1. **build** — `npm ci` → `npm run build` → `actions/upload-pages-artifact@v3` uploads
   `dist/`.
2. **deploy** — `actions/deploy-pages@v5` publishes that artifact to the
   `github-pages` environment.

`ci.yml` (lint + smoke + preview + link-check + Lighthouse) runs **in parallel** on the
same push and is the quality gate; `deploy.yml` only ships. A failed build skips the
deploy job, so a broken build never publishes. `concurrency: pages` +
`cancel-in-progress: false` means one deploy at a time and an in-flight publish is left
to finish.

`public/.nojekyll` ships inside the artifact (as `dist/.nojekyll`) — **required** so
GitHub Pages doesn't run Jekyll, which would drop Astro's leading-underscore
`_astro/` asset dir and 404 every hashed CSS/JS file.

## To redeploy the fallback

Just land a change on `main`:

```bash
git checkout main && git pull
# …make your edits…
npm run build && npm run test        # local sanity (optional but recommended)
git commit -am "feat: …"
git push origin main                 # ← triggers deploy.yml
```

Or redeploy the current `main` with no code change (e.g. after a settings tweak):

```bash
gh workflow run "Deploy (GitHub Pages)" --repo ahmadjz/nabta-web-landing
```

Watch it:

```bash
gh run list  --repo ahmadjz/nabta-web-landing --limit 5
gh run watch <run-id> --repo ahmadjz/nabta-web-landing --exit-status
```

First-ever publish can take a few minutes to propagate; subsequent deploys are quick.

## Verify the fallback

```bash
BASE="https://ahmadjz.github.io/nabta-web-landing"
for p in /privacy/ /terms/ / /en/ /en/privacy/ /en/terms/; do
  echo "$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$p")  $BASE$p"
done
# spot-check real content + that an _astro asset loads (proves .nojekyll worked):
curl -sSfL "$BASE/privacy/" | grep -o '<title>[^<]*</title>'
asset=$(curl -sSfL "$BASE/privacy/" | grep -o '/nabta-web-landing/_astro/[^"]*' | head -1)
curl -sL -o /dev/null -w "%{http_code}  https://ahmadjz.github.io$asset\n" "https://ahmadjz.github.io$asset"
```

Expect `200` for every page and the asset.

### Motion / RTL / reduce-motion = a MANUAL browser check

The curl matrix only proves the pages and assets **serve**. The site's runtime
behaviour **cannot be curl'd**. CI gates it headlessly (`scripts/preview-smoke.mjs` +
`motion-a11y.test.mjs` — the reduce-motion / toggle / LCP / coarse-pointer proofs run
in a real Chrome, `REQUIRE_HEADLESS=1`, never a silent skip), but after a deploy still
do a quick **manual browser pass on the live URL**. Load `…/nabta-web-landing/` on a
fine-pointer (desktop) device and confirm:

- **Signature hero foliage** — the layered motifs drift/parallax under the pointer at
  ~60fps (the one bundled `motion` island, `pointer:fine` only). The `<h1>` is opaque
  from first paint (never waits on JS).
- **Scroll choreography** — sections enter on scroll and the Screenshots thumbs
  parallax as you scroll past.
- **Magnetic CTA** — the primary download CTA eases toward a fine pointer; it is
  **inert on touch** (coarse pointer = no drift).
- **Count-up stats** — the impact numbers animate up to the **real** figure (and the
  no-JS / screen-reader text already reads that real figure, never `0`).
- **ar↔en swap** — toggle the language and confirm the layout mirrors (`<html dir>`
  flips rtl↔ltr, the display face swaps) with the crossfade, and the header
  wordmark/dir is correct on the swapped-in page (never a stale RTL header on `/en/`).
- **Both reduce signals make it static, independently.** (1) Re-load with
  `prefers-reduced-motion: reduce` (DevTools → Rendering → *Emulate CSS media
  feature*) and (2) with OS preference OFF, click the **in-page motion toggle**
  (`aria-pressed`, persists across reload + swap). Each on its own must collapse
  everything — reveals, ambient/signature drift, scroll timeline, magnetic pull — to
  **instant/static content** (no fade-in, no drift, no parallax).

Note any finding.

## One-time setup (already done — reference only)

These were applied once to bring Pages online. You don't repeat them per deploy.

1. **Repo is public** — Pages on a free *private* repo can't publish.
2. **Pages source = "GitHub Actions"** — set in **Settings → Pages → Build and
   deployment → Source**, or via API:
   ```bash
   gh api repos/ahmadjz/nabta-web-landing/pages -X POST -f build_type=workflow
   gh api repos/ahmadjz/nabta-web-landing/pages           # confirm build_type:workflow
   ```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Deploy job fails: **"Get Pages site failed"** | Pages not enabled / source ≠ GitHub Actions — redo one-time setup #2. |
| Pages load but **CSS/JS 404** (`_astro/…`) | `.nojekyll` missing from the artifact — confirm `public/.nojekyll` exists and `dist/.nojekyll` is emitted (`npm run test` asserts it). |
| **404** on a bare `…/privacy` | Expected — it 301s to `…/privacy/`. Use `curl -L`. |
| Workflow didn't trigger | Push wasn't to `main`, or use `gh workflow run "Deploy (GitHub Pages)"`. |

## Deployment targets

`astro.config.mjs` defaults to GitHub Pages. `npm run build:apex` selects the VPS
target with `NABTA_LANDING_SITE=https://nabteh.app` and `NABTA_LANDING_BASE=/`; the
apex tests use those same variables. Do not set a GitHub Pages custom domain while
the VPS owns the apex DNS record.

## Play-Store submission gate ⚠️

Update the existing Play Console privacy URL to `https://nabteh.app/privacy/` before
retiring the GitHub Pages fallback. Submission remains **blocked** until
[`src/config/legal.ts`](src/config/legal.ts) `LEGAL_IS_DRAFT` is cleared: while true,
every legal page is noindex, shows the DRAFT banner, and is excluded from the sitemap.
