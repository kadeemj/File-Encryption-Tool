import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Inject a strict Content-Security-Policy meta tag into the production build.
 *
 * GitHub Pages can't set response headers, so a meta tag is the only way to
 * ship a CSP there. It's applied only in `vite build`: the dev server injects
 * inline scripts for HMR/react-refresh, which a strict `script-src 'self'`
 * would block.
 */
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return {
    name: "inject-csp",
    apply: "build",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: { "http-equiv": "Content-Security-Policy", content: csp },
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

// https://vite.dev/config/
// Relative base keeps assets working on GitHub Pages project sites
// (https://kadeemj.github.io/File-Encryption-Tool/) and locally.
export default defineConfig({
  base: "./",
  plugins: [react(), cspPlugin()],
  test: {
    // The crypto module is framework-agnostic and needs no DOM. We run unit
    // tests in Node, which ships a real Web Crypto (`crypto.subtle`); jsdom
    // does not implement SubtleCrypto, so it would break these tests.
    environment: "node",
    globals: true,
    // Playwright specs live in e2e/ and must not be picked up by Vitest.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
