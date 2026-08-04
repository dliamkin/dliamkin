import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import App from './App.vue'
import 'primeicons/primeicons.css'
import './style.css'

// Aura, sky-primary — a weather app deserves a sky palette. Dark mode is
// bound to the .dro-dark class on <html> (always on; see index.html).
const OraclePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '{sky.500}',
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      950: '{sky.950}',
    },
  },
})

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: OraclePreset,
    options: { darkModeSelector: '.dro-dark' },
  },
})
app.use(ToastService)
app.mount('#app')
