// CLS img-dims guard (LVR-TASK-06). The two media-heavy sections (Screenshots +
// Testimonials) are the site's highest layout-shift risk: an undimensioned <img>
// reflows the page as it decodes, spiking CLS. Every raster image on the site
// flows through astro:assets `<Image>`, which emits intrinsic width+height — this
// test re-asserts that contract on the BUILT `dist` HTML so a hand-rolled bare
// <img> (or a regression that drops the attributes) can never ship.
//
// A pure file-scan over dist/**/*.html (no browser) — runs AFTER `npm run build`,
// matching the build-smoke / marketing dist-assertion style. An <img> passes if it
// carries BOTH width and height attributes OR sits in an explicit aspect-ratio box
// (an `aspect-*` utility / inline `aspect-ratio`), the two CLS-safe sizing modes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

/** Recursively collect files under `dir` whose name ends in `ext`. */
function walk(dir, ext, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, ext, acc);
    else if (full.endsWith(ext)) acc.push(full);
  }
  return acc;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
};

const HTML = walk(DIST, ".html");

test("dist contains built HTML to scan (build ran first)", () => {
  assert.ok(
    HTML.length > 0,
    "no dist/**/*.html found — run `npm run build` before the tests",
  );
});

test("every <img> in dist is CLS-safe (width+height or an aspect-ratio box)", () => {
  const offenders = [];
  for (const file of HTML) {
    const rel = file.slice(DIST.length + 1);
    const html = readFileSync(file, "utf8");
    for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
      const w = attr(tag, "width");
      const h = attr(tag, "height");
      const dimensioned =
        w !== null && h !== null && Number(w) > 0 && Number(h) > 0;
      const cls = attr(tag, "class") ?? "";
      const style = attr(tag, "style") ?? "";
      const aspectBox =
        /\baspect-(?:\[|video|square|auto|\d)/.test(cls) ||
        /aspect-ratio\s*:/.test(style);
      if (!dimensioned && !aspectBox) {
        offenders.push(`${rel}: ${tag}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `undimensioned <img> (CLS risk) — give it width+height (astro:assets <Image> does) or an aspect-ratio box:\n${offenders.join("\n")}`,
  );
});

test("the marketing home pages still render their media images (guard not vacuous)", () => {
  // Screenshots (3) + testimonial avatars (3) — both locale home routes must keep
  // emitting their <img> set, so the dimension assertion above can't pass merely
  // because the sections stopped rendering any images.
  for (const page of ["index.html", join("en", "index.html")]) {
    const html = readFileSync(join(DIST, page), "utf8");
    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    assert.ok(
      imgs.length >= 6,
      `${page}: expected ≥6 media <img> (3 screenshots + 3 avatars), found ${imgs.length}`,
    );
  }
});
