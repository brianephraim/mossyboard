import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noRawTextInTamaguiView from "./eslint-rules/no-raw-text-in-tamagui-view.mjs";

const tamaguiGuardrailsPlugin = {
  rules: {
    "no-raw-text-in-tamagui-view": noRawTextInTamaguiView,
  },
};

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "dist/**",
    "**/dist/**",
    "build/**",
    "**/build/**",
    ".vercel/**",
    ".output/**",
    ".tamagui/**",
    ".claude/**",
    "coverage/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      tamaguiGuardrails: tamaguiGuardrailsPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "tamaguiGuardrails/no-raw-text-in-tamagui-view": "error",
      // handled globally above, but keep unused-vars as error for src
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
]);
