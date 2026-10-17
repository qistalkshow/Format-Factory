import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const csp =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    {
      name: 'production-csp',
      apply: 'build',
      transformIndexHtml: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
          injectTo: 'head-prepend',
        },
      ],
    },
  ],
  build: { manifest: true },
  worker: { format: 'es' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
