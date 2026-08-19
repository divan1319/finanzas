// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vite-pwa/nuxt',
    'nuxt-auth-utils'
  ],

  pwa: {
    manifest: {
      name: 'Finanzas Personales',
      short_name: 'Finanzas',
      description: 'Estrategia de 2 tarjetas, nóminas y control de gastos inteligente',
      theme_color: '#0f172a',
      background_color: '#020617',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any'
        }
      ]
    },
    workbox: {
      navigateFallback: null,
      navigateFallbackDenylist: [/^\/api/, /^\/_auth/],
      globPatterns: process.env.NODE_ENV === 'production' ? ['**/*.{js,css,html,png,svg,ico,woff2}'] : undefined,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.includes('auth'),
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
            },
            cacheableResponse: {
              statuses: [0, 200]
            },
            networkTimeoutSeconds: 3
          }
        }
      ]
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    appPassword: process.env.APP_PASSWORD || 'admin123',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || 'finanzas-super-secret-session-key-32-chars-long-abc'
    },
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || ''
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
