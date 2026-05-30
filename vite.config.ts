import { defineConfig } from 'vitest/config';

// Single config for Vite (dev/build) + Vitest (unit tests).
// `base` is set for GitHub Pages project-site paths ONLY in production builds,
// so the deployed URL https://masterhan.github.io/sugarspark-bakery/ resolves assets.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/sugarspark-bakery/' : '/',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    // Pure game-logic systems are Phaser-free, so tests run in plain Node — no DOM needed.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
}));
