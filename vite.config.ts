import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // The crypto module is framework-agnostic and needs no DOM. We run unit
    // tests in Node, which ships a real Web Crypto (`crypto.subtle`); jsdom
    // does not implement SubtleCrypto, so it would break these tests.
    environment: 'node',
    globals: true,
    // Playwright specs live in e2e/ and must not be picked up by Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
