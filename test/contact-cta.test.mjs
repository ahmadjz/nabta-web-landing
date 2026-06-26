// Contact email-only + download-CTA contract (LVR-TASK-07). The marketing site has
// NO backend: contact is a `mailto:` only, and the optional WhatsApp/phone channels
// render ONLY when their config constant is set. While both are empty (the default),
// the built pages must expose the email channel and carry NO dead `tel:`/`wa.me`
// link — the contact analog of marketing.test's "no dead Play Store href" guard.
//
// Pure dist file-scan, run AFTER `npm run build` (CI orders build → test). Imports
// the `.ts` config directly (Node 24 strips types). Deliberately does NOT assert a
// WhatsApp/phone link EXISTS — that would invert the contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTACT_EMAIL,
  CONTACT_WHATSAPP,
  CONTACT_PHONE,
} from "../src/config.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const PAGES = ["index.html", join("en", "index.html")];
const read = (page) => readFileSync(join(DIST, page), "utf8");

test("email channel renders on both home routes (mailto: to the shared address)", () => {
  for (const page of PAGES) {
    assert.ok(
      read(page).includes(`mailto:${CONTACT_EMAIL}`),
      `${page}: contact section is missing the mailto:${CONTACT_EMAIL} channel`,
    );
  }
});

test("no dead tel:/WhatsApp link while the optional channels are unconfigured", () => {
  // Guard the premise: this contract is only meaningful with both empty.
  assert.equal(
    CONTACT_WHATSAPP,
    "",
    "CONTACT_WHATSAPP is set — flip this test when the channel goes live",
  );
  assert.equal(
    CONTACT_PHONE,
    "",
    "CONTACT_PHONE is set — flip this test when the channel goes live",
  );
  for (const page of PAGES) {
    const html = read(page);
    assert.ok(
      !/href="tel:/.test(html),
      `${page}: a dead tel: link leaked while CONTACT_PHONE is empty`,
    );
    assert.ok(
      !/wa\.me\//.test(html),
      `${page}: a dead wa.me link leaked while CONTACT_WHATSAPP is empty`,
    );
  }
});

test("the download CTA on the forest band stays disabled (coming soon)", () => {
  // The forest-band rebuild reuses DownloadButton unchanged; re-anchor the disabled
  // contract in the DownloadCTA context (marketing.test owns the global assertion).
  for (const page of PAGES) {
    assert.match(
      read(page),
      /data-download-cta[^>]*data-state="disabled"/,
      `${page}: forest-band DownloadCTA dropped the disabled coming-soon contract`,
    );
  }
});
