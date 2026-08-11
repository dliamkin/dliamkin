import loginPng from "@/assets/demo-samples/login.png";
import dashboardPng from "@/assets/demo-samples/dashboard.png";
import pricingPng from "@/assets/demo-samples/pricing.png";
import loginThumb from "@/assets/demo-samples/login-thumb.webp";
import dashboardThumb from "@/assets/demo-samples/dashboard-thumb.webp";
import pricingThumb from "@/assets/demo-samples/pricing-thumb.webp";

// Vite-resolved asset URLs for the bundled sample screenshots, keyed by
// sample id (see screenshot-samples.ts).
export const SCREENSHOT_SAMPLE_IMAGES: Record<string, string> = {
	login: loginPng,
	dashboard: dashboardPng,
	pricing: pricingPng,
};

// Small webp twins for the sample-picker cards (the cards render ~290 CSS px
// wide; the full 1280px PNGs cost ~380KB where these cost ~16KB). The full
// PNGs above are still what loads into the preview when a sample is picked.
// Regenerate with scripts/optimize-images.mjs.
export const SCREENSHOT_SAMPLE_THUMBS: Record<string, string> = {
	login: loginThumb,
	dashboard: dashboardThumb,
	pricing: pricingThumb,
};
