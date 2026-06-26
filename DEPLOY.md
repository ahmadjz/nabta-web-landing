# Deploy runbook — nabta-web-landing

How this static site reaches production on **GitHub Pages**, how to **redeploy** it,
and how to **verify** a deploy. The workflow is
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Live URL

- **Site:** `https://ahmadjz.github.io/nabta-web-landing/`
- **Privacy:** `https://ahmadjz.github.io/nabta-web-landing/privacy` (Play Console link)
- **Terms:** `https://ahmadjz.github.io/nabta-web-landing/terms`
- English mirror under `/en/` (e.g. `…/en/privacy`).

> Project pages serve under the **`/nabta-web-landing/` sub-path**, never the domain
> root — that's why every URL is base-prefixed (see [CLAUDE.md](CLAUDE.md) → sub-path
> strategy). `astro` emits directory-style pages, so `…/privacy` **301-redirects** to
> `…/privacy/` — both resolve; always `curl -L`.

## How a deploy happens

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

## To redeploy (the normal case)

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

## Verify a deploy

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

The curl matrix only proves the pages and assets **serve**. The redesign's runtime
behaviour — `ClientRouter` fade transitions, scroll-reveal fire, the ambient hero
motif drift, **`prefers-reduced-motion` collapsing to instant content**, and correct
**Arabic RTL mirroring** — **cannot be curl'd**. CI gates it headlessly
(`scripts/preview-smoke.mjs` + `motion-a11y.test.mjs`), but after a deploy do a quick
**manual browser pass on the live URL**: load `…/nabta-web-landing/`, watch a section
reveal on scroll and the hero ambience play, toggle ar↔en and confirm the layout
mirrors (`<html dir>` flips, display face swaps), then re-load with
`prefers-reduced-motion: reduce` (DevTools → Rendering → *Emulate CSS media feature*)
and confirm content appears **instantly** (no fade-in, no drift). Note any finding.

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

## Custom domain (later)

Flip `base` → `/` in [`astro.config.mjs`](astro.config.mjs), add the domain under
**Settings → Pages → Custom domain** (and a repo `CNAME`/DNS). Nothing else changes —
every URL funnels through `site`/`base` + [`src/lib/base.ts`](src/lib/base.ts).

## Play-Store submission gate ⚠️

The privacy URL is **live and stable**, but the Play-Store submission of it stays
**blocked** until [`src/config/legal.ts`](src/config/legal.ts) `LEGAL_IS_DRAFT` is
cleared (binding legal text landed — SITE-03). While `true`, every legal page is
`noindex`, shows the DRAFT banner, and is excluded from the sitemap. The URL itself
never relocates, so clearing the flag + redeploying is all that's needed when the text
arrives.
