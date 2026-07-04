import { describe, expect, it, vi, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import SiteHealthWidget from "../SiteHealthWidget.vue";
import type { HealthReport, HealthStatus } from "@/lib/site-health";

function makeReport(status: HealthStatus): HealthReport {
	return {
		audited_at: new Date().toISOString(),
		status,
		summary: "Fixture summary for the widget test.",
		pages: [
			{
				path: "/",
				lighthouse: {
					performance: 95,
					accessibility: 98,
					best_practices: 100,
					seo: 92,
					lcp_ms: 1800,
					cls: 0.01,
					tbt_ms: 40,
				},
				visual_findings: [],
				visual_fingerprint: "Homepage renders correctly.",
			},
		],
		score_deltas: [],
		top_fix: null,
		should_file_issue: false,
		issue_title: null,
		issue_body: null,
		issue_fingerprint: null,
		error_reason: status === "audit_error" ? "fixture failure" : null,
	};
}

function stubFetch(body: unknown, contentType = "application/json") {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => contentType },
			json: async () => body,
		}),
	);
}

function mountWidget() {
	return mount(SiteHealthWidget, { global: { plugins: [PrimeVue] } });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("SiteHealthWidget", () => {
	it.each([
		["healthy", "Healthy"],
		["warnings", "Warnings"],
		["regression", "Regression"],
		["audit_error", "Audit skipped"],
	] as const)("renders the %s status", async (status, label) => {
		stubFetch(makeReport(status));
		const wrapper = mountWidget();
		await flushPromises();
		expect(wrapper.text()).toContain(label);
		expect(wrapper.text()).toContain("Fixture summary");
	});

	it("renders nothing before the first audit exists (SPA fallback returns HTML)", async () => {
		// The SPA fallback answers /site-health/latest.json with index.html
		// and HTTP 200 when the file doesn't exist yet.
		stubFetch("<!doctype html>", "text/html");
		const wrapper = mountWidget();
		await flushPromises();
		expect(wrapper.html()).not.toContain("Site health");
	});

	it("renders nothing when the payload is not a health report", async () => {
		stubFetch({ hello: "world" });
		const wrapper = mountWidget();
		await flushPromises();
		expect(wrapper.html()).not.toContain("Site health");
	});
});
