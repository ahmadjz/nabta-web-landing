// App-icon generator (SITE-04). Rasterises the single brand SVG (public/favicon.svg)
// into the PNG favicon + app-icon set the manifest + <head> reference. The SVG
// stays the source of truth; re-run `node scripts/gen-icons.mjs` if it changes.
//
// `sharp` is Astro's image dependency (already in node_modules) — reused here as a
// dev-only tool, NOT a runtime/site dependency (same as scripts/gen-placeholders.mjs).
// Icons are FLATTENED onto the brand green so the apple-touch / maskable variants
// are fully opaque squares (the SVG's rounded corners are otherwise transparent).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const BRAND_GREEN = "#2E7D32"; // matches src/config.ts BRAND_COLOR + favicon.svg
const svg = readFileSync(join(PUBLIC_DIR, "favicon.svg"));

// size, filename, flatten? — favicon-32 keeps transparency; the rest are opaque.
const ICONS = [
  { size: 32, file: "favicon-32.png", flatten: false },
  { size: 180, file: "apple-touch-icon.png", flatten: true },
  { size: 192, file: "icon-192.png", flatten: true },
  { size: 512, file: "icon-512.png", flatten: true },
];

for (const { size, file, flatten } of ICONS) {
  let pipeline = sharp(svg, { density: 384 }).resize(size, size);
  if (flatten) pipeline = pipeline.flatten({ background: BRAND_GREEN });
  await pipeline.png().toFile(join(PUBLIC_DIR, file));
  console.log(`✓ ${file} (${size}×${size})`);
}
