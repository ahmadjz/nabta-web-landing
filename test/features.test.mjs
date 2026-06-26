// Feature-bento icon contract (LVR-05). Icons are mapped BY ARRAY INDEX
// (FEATURE_ICONS) onto marketing.features.items and kept OUT of the i18n dict so
// the strict ar/en key-path parity (marketing.test) stays clean. This pins the
// tuple's length to features.items in BOTH locales so an icon can never desync
// from the copy on one side, and guards the directional-mirror set against typos.
// Imports the .ts sources directly (Node 24 strips types natively).

import { test } from "node:test";
import assert from "node:assert/strict";

import { ar } from "../src/i18n/ar.ts";
import { en } from "../src/i18n/en.ts";
import {
  FEATURE_ICONS,
  MIRROR_IN_RTL,
} from "../src/components/sections/feature-icons.ts";

test("feature icon tuple length matches features.items in BOTH locales", () => {
  assert.equal(
    FEATURE_ICONS.length,
    ar.marketing.features.items.length,
    `FEATURE_ICONS (${FEATURE_ICONS.length}) != ar features.items (${ar.marketing.features.items.length})`,
  );
  assert.equal(
    FEATURE_ICONS.length,
    en.marketing.features.items.length,
    `FEATURE_ICONS (${FEATURE_ICONS.length}) != en features.items (${en.marketing.features.items.length})`,
  );
});

test("every feature icon name is a non-empty, unique string", () => {
  for (const [i, name] of FEATURE_ICONS.entries()) {
    assert.ok(
      typeof name === "string" && name.trim().length > 0,
      `FEATURE_ICONS[${i}] must be a non-empty icon name`,
    );
  }
  assert.equal(
    new Set(FEATURE_ICONS).size,
    FEATURE_ICONS.length,
    "FEATURE_ICONS has duplicate icon names",
  );
});

test("RTL-mirror set only names icons that exist in the tuple", () => {
  for (const name of MIRROR_IN_RTL) {
    assert.ok(
      FEATURE_ICONS.includes(name),
      `MIRROR_IN_RTL names "${name}" which is not in FEATURE_ICONS`,
    );
  }
});
