import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { cloudflare } from '@cloudflare/vite-plugin'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // The SPA paints nothing until the JS bundle executes, so a separate
    // render-blocking stylesheet only delays first paint (PageSpeed flagged it
    // at ~240ms). Shipping the CSS inside the bundle removes that request; the
    // styles are injected synchronously before app.mount, so nothing renders
    // unstyled. index.html carries a tiny inline fallback background so the
    // pre-JS blank frame keeps the right theme color.
    // relativeCSSInjection keeps CSS code-split: each lazy route chunk injects
    // only its own styles when it loads, instead of everything landing in the
    // entry bundle.
    cssInjectedByJsPlugin({ relativeCSSInjection: true }),
    // Runs worker/index.ts inside the Vite dev server (workerd), so a single
    // `npm run dev` serves the Vue app with HMR AND the /api/* endpoints.
    // Reads wrangler.jsonc; local secrets come from .dev.vars.
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
