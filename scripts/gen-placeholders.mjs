// Placeholder-asset generator (SITE-02). Rasterises a few brand-coloured SVGs to
// PNG so the marketing landing has real <Image>-optimisable screenshots/avatars
// and a valid 1200×630 OG card BEFORE the real art exists. These are PLACEHOLDERS
// — SITE-04 / launch replaces the PNGs (the alt text + captions already carry the
// real meaning in HTML). Re-run with `node scripts/gen-placeholders.mjs`.
//
// `sharp` is Astro's image dependency (already in node_modules) — this dev-only
// script reuses it; it is NOT a runtime/site dependency. Text is kept Latin-only
// so it renders without needing an Arabic system font installed.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const ASSETS_DIR = join(ROOT, "src", "assets");
mkdirSync(ASSETS_DIR, { recursive: true });

const GREEN = "#2E7D32"; // brand primary (AppColors.primary)
const GREEN_DK = "#1B5E20";

// A tiny two-leaf sprout mark, scalable via a transform wrapper.
const sprout = (cx, cy, scale, fill) => `
  <g transform="translate(${cx} ${cy}) scale(${scale})" fill="${fill}">
    <path d="M0 28 L0 2" stroke="${fill}" stroke-width="3" />
    <path d="M0 12 C-22 8 -26 -12 -2 -10 C-2 10 -2 10 0 12 Z" />
    <path d="M0 4 C22 0 26 -20 2 -18 C2 2 2 2 0 4 Z" />
  </g>`;

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GREEN}" />
      <stop offset="1" stop-color="${GREEN_DK}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  ${sprout(600, 215, 3.4, "#ffffff")}
  <text x="600" y="400" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="104" font-weight="700" fill="#ffffff">Nabta</text>
  <text x="600" y="470" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="36" fill="#E8F5E9">Your plant world, in your hands</text>
  <text x="600" y="556" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="22" letter-spacing="3" fill="#A5D6A7">PLACEHOLDER · OG IMAGE</text>
</svg>`;

const screenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200" viewBox="0 0 600 1200">
  <rect width="600" height="1200" fill="#F1F5F2" />
  <rect x="40" y="40" width="520" height="1120" rx="44" fill="#ffffff"
        stroke="#D7E3DA" stroke-width="2" />
  <rect x="40" y="40" width="520" height="120" rx="44" fill="${GREEN}" />
  <rect x="40" y="120" width="520" height="40" fill="${GREEN}" />
  ${sprout(300, 520, 4.2, GREEN)}
  <text x="300" y="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="34" font-weight="700" fill="${GREEN_DK}">App screenshot</text>
  <text x="300" y="748" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="26" fill="#6B8576">placeholder</text>
</svg>`;

const avatarSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#E8F0EA" />
  <circle cx="120" cy="96" r="44" fill="#B7CDBE" />
  <path d="M40 220 C40 160 200 160 200 220 Z" fill="#B7CDBE" />
</svg>`;

async function emit(svg, outPath, label) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`✓ ${label} → ${outPath.slice(ROOT.length + 1)}`);
}

await emit(ogSvg, join(PUBLIC_DIR, "og-image.png"), "OG card 1200×630");
await emit(
  screenshotSvg,
  join(ASSETS_DIR, "app-screenshot-placeholder.png"),
  "app screenshot 600×1200",
);
await emit(
  avatarSvg,
  join(ASSETS_DIR, "avatar-placeholder.png"),
  "avatar 240×240",
);
