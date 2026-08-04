import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Dev proxy: the browser talks to /api, Vite forwards to the Express proxy on 3001.
// The Anthropic API key never reaches the browser.
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
