import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules", ".astro"]),
  {
    files: ["**/*.{ts,mjs,js}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // Ambient declaration files legitimately use triple-slash references
  // (env.d.ts is the standard Astro pattern).
  {
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/triple-slash-reference": "off" },
  },
  // Astro components — the plugin sets the parser + a11y/static-analysis rules.
  ...astro.configs["flat/recommended"],
  // Keep last: turn off stylistic rules that conflict with Prettier.
  eslintConfigPrettier,
]);
