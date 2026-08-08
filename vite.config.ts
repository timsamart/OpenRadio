import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Project Pages (GitLab or GitHub) serve from a subpath — `/openradio/` — not
 * from the origin root. Everything path-shaped therefore reads from one place:
 *
 *   PAGES_BASE=/openradio/ npm run build
 *
 * Defaults to '/' for dev, user/group Pages, and custom domains.
 */
const base = (process.env.PAGES_BASE ?? '/').replace(/\/*$/, '/');

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'OpenRadio — Greek live radio',
        short_name: 'OpenRadio',
        description: 'Open. Tap. Listen. Greek live radio, no account, no ads added by us.',
        lang: 'el',
        dir: 'ltr',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBF7EF',
        theme_color: '#FBF7EF',
        categories: ['music', 'entertainment'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App shell only. Live audio is NEVER routed through the service worker
        // (PRD §42) — cross-origin stream requests match no runtime rule below.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // /radio/:id deep links must resolve to the shell, not 404.
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // The curated catalog: serve instantly from cache, refresh in the
            // background. Catalog failure must never destroy cached favorites
            // (guardrail 7) — favorites live in IndexedDB, not here.
            urlPattern: ({ url }) => url.pathname.endsWith('/catalog.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'openradio-catalog',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Station artwork, same-origin only. Remote logos are not proxied.
            urlPattern: ({ url, request }) =>
              request.destination === 'image' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openradio-art',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
