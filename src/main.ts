import "./assets/main.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import Tooltip from "primevue/tooltip";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

import App from "./App.vue";
import router from "./router";

// Aura preset re-tinted to the site's #27a9e0 accent.
const sitePreset = definePreset(Aura, {
	semantic: {
		primary: {
			50: "#eef9fd",
			100: "#d5f0fa",
			200: "#aee1f5",
			300: "#7fcfee",
			400: "#4fbce7",
			500: "#27a9e0",
			600: "#1f8fc0",
			700: "#19749c",
			800: "#135978",
			900: "#0d3e54",
			950: "#082a39",
		},
	},
});

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
	theme: {
		preset: sitePreset,
		// The site themes off an html.dark class (dark by default, light as an
		// explicit visitor choice) — keep PrimeVue on the same switch.
		options: { darkModeSelector: ".dark" },
	},
});
app.use(ToastService);
app.directive("tooltip", Tooltip);

app.mount("#app");
