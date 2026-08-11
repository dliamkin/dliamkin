import type { App } from "vue";

// Kicks off the async PrimeVue install (see src/primevue-setup.ts) and lets
// anything that renders PrimeVue components await it. Separate module so
// HomeView can import primevueReady without a circular import through
// main.ts.

let ready: Promise<void> | null = null;

export function startPrimeVue(app: App): Promise<void> {
	ready ??= import("../primevue-setup").then((m) => m.install(app));
	return ready;
}

export function primevueReady(): Promise<void> {
	// startPrimeVue runs during app boot, before anything can await this;
	// the fallback only guards odd orderings (tests, future refactors).
	return ready ?? Promise.resolve();
}
