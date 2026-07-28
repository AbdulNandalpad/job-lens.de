import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node/CommonJS services deployed separately (Railway) —
    // not part of the Next.js app, not built with the Next.js toolchain.
    "browser-service/**",
    "invoice-service/**",
    "realtime-service/**",
    // Standalone CommonJS CLI script (`node scripts/generate-docs.js`) — not bundled by Next.js.
    "scripts/**",
  ]),
  {
    rules: {
      // Next.js pages read sessionStorage/localStorage/URL params on mount to stay
      // SSR-hydration-safe — that requires setState inside useEffect by design.
      // The alternative (lazy useState init) would read browser-only APIs during
      // the render Next.js also runs on the server, breaking hydration.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
