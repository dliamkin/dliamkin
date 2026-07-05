<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Tag from "primevue/tag";
import {
	HEALTH_STATUSES,
	type HealthHistoryEntry,
	type HealthReport,
	type HealthStatus,
} from "@/lib/site-health";

// Reads the static JSON committed nightly by .github/workflows/site-health.yml
// — no API, no key, no per-visitor cost. Before the first audit exists the
// widget renders nothing: the SPA fallback answers unknown paths with
// index.html (HTTP 200), so "missing" is detected by content-type + shape,
// not status code.

const REPO_URL = "https://github.com/dliamkin/dliamkin";
const ISSUES_URL = `${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+label%3Asite-health`;
const WORKFLOW_URL = `${REPO_URL}/blob/main/.github/workflows/site-health.yml`;

const report = ref<HealthReport | null>(null);
const history = ref<HealthHistoryEntry[]>([]);
const showDetails = ref(false);

function isHealthReport(value: unknown): value is HealthReport {
	return (
		typeof value === "object" &&
		value !== null &&
		HEALTH_STATUSES.includes((value as HealthReport).status) &&
		Array.isArray((value as HealthReport).pages)
	);
}

async function fetchJson(path: string): Promise<unknown> {
	const response = await fetch(path);
	if (!response.ok || !response.headers.get("content-type")?.includes("json")) {
		return null;
	}
	return response.json();
}

onMounted(async () => {
	try {
		const data = await fetchJson("/site-health/latest.json");
		if (isHealthReport(data)) report.value = data;
	} catch {
		// No report yet (or unreachable) — render nothing.
	}
});

async function openDetails() {
	showDetails.value = true;
	if (history.value.length === 0) {
		try {
			const data = await fetchJson("/site-health/history.json");
			if (Array.isArray(data)) history.value = data as HealthHistoryEntry[];
		} catch {
			// Sparkline just stays hidden.
		}
	}
}

const statusMeta: Record<HealthStatus, { severity: string; label: string }> = {
	healthy: { severity: "success", label: "Healthy" },
	warnings: { severity: "warn", label: "Warnings" },
	regression: { severity: "danger", label: "Regression" },
	audit_error: { severity: "secondary", label: "Audit skipped" },
};

const meta = computed(() => (report.value ? statusMeta[report.value.status] : null));

const lastAudited = computed(() => {
	if (!report.value) return "";
	const ms = Date.now() - new Date(report.value.audited_at).getTime();
	const minutes = Math.round(ms / 60_000);
	if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 48) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
});

const averages = computed(() => {
	const pages = report.value?.pages ?? [];
	if (pages.length === 0) return null;
	const avg = (pick: (p: (typeof pages)[number]) => number) =>
		Math.round(pages.reduce((sum, p) => sum + pick(p), 0) / pages.length);
	return [
		{ label: "Perf", value: avg((p) => p.lighthouse.performance) },
		{ label: "A11y", value: avg((p) => p.lighthouse.accessibility) },
		{ label: "Best", value: avg((p) => p.lighthouse.best_practices) },
		{ label: "SEO", value: avg((p) => p.lighthouse.seo) },
	];
});

// Minimal inline SVG sparkline of nightly average performance — no chart
// dependency needed for a 90-point line.
const sparkline = computed(() => {
	const points = history.value.map((entry) => entry.scores.performance);
	if (points.length < 2) return null;
	const width = 140;
	const height = 36;
	const step = width / (points.length - 1);
	return points
		.map(
			(score, i) =>
				`${(i * step).toFixed(1)},${(height - (score / 100) * height).toFixed(1)}`,
		)
		.join(" ");
});
</script>

<template>
	<div v-if="report && meta" class="site-health">
		<button
			type="button"
			class="health-summary-btn"
			:aria-label="`Site health: ${meta.label}. Open details.`"
			@click="openDetails"
		>
			<Tag :severity="meta.severity" :value="meta.label" class="health-tag" />
			<span class="health-copy">
				<span class="health-title">Site health · audited {{ lastAudited }}</span>
				<span class="health-blurb">{{ report.summary }}</span>
			</span>
			<span v-if="averages" class="health-scores">
				<span v-for="score in averages" :key="score.label" class="score">
					<span class="score-value">{{ score.value }}</span>
					<span class="score-label">{{ score.label }}</span>
				</span>
			</span>
		</button>

		<Dialog
			v-model:visible="showDetails"
			modal
			header="Nightly AI Site Health Audit"
			class="health-dialog"
			:style="{ width: 'min(680px, 94vw)' }"
		>
			<p class="dialog-framing">
				This site audits itself nightly —
				<a :href="WORKFLOW_URL" target="_blank" rel="noopener noreferrer"
					>Lighthouse + Playwright + an AI reviewer in CI</a
				>. Findings are filed as
				<a :href="ISSUES_URL" target="_blank" rel="noopener noreferrer">GitHub issues</a>
				automatically.
			</p>

			<p class="dialog-status">
				<Tag :severity="meta.severity" :value="meta.label" />
				<span>{{ report.summary }}</span>
			</p>

			<DataTable :value="report.pages" size="small" class="dialog-table">
				<Column field="path" header="Page" />
				<Column header="Perf">
					<template #body="{ data }">{{ data.lighthouse.performance }}</template>
				</Column>
				<Column header="A11y">
					<template #body="{ data }">{{ data.lighthouse.accessibility }}</template>
				</Column>
				<Column header="Best">
					<template #body="{ data }">{{ data.lighthouse.best_practices }}</template>
				</Column>
				<Column header="SEO">
					<template #body="{ data }">{{ data.lighthouse.seo }}</template>
				</Column>
			</DataTable>

			<p v-if="report.top_fix" class="dialog-topfix">
				<strong>Top recommended fix:</strong> {{ report.top_fix }}
			</p>

			<div v-if="sparkline" class="dialog-trend">
				<span class="trend-label">Performance trend (nightly avg)</span>
				<svg
					viewBox="0 0 140 36"
					width="140"
					height="36"
					role="img"
					aria-label="Performance score trend"
				>
					<polyline
						:points="sparkline"
						fill="none"
						stroke="#27a9e0"
						stroke-width="2"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				</svg>
			</div>

			<template #footer>
				<Button
					label="Open site-health issues"
					icon="fa-brands fa-github"
					severity="secondary"
					size="small"
					as="a"
					:href="ISSUES_URL"
					target="_blank"
					rel="noopener noreferrer"
				/>
			</template>
		</Dialog>
	</div>
</template>

<style scoped>
.health-summary-btn {
	display: flex;
	align-items: center;
	gap: 1rem;
	max-width: 620px;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.09);
	border-radius: 10px;
	padding: 0.6rem 0.9rem;
	cursor: pointer;
	text-align: left;
	font-family: "Raleway", sans-serif;
	color: #cdd3da;
	transition:
		border-color 0.25s ease,
		background 0.25s ease;
}

.health-summary-btn:hover {
	border-color: rgba(102, 198, 239, 0.5);
	background: rgba(255, 255, 255, 0.07);
}

.health-tag {
	flex-shrink: 0;
	font-size: 0.7rem;
}

.health-copy {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	min-width: 0;
}

.health-title {
	font-size: 0.78rem;
	font-weight: 700;
	color: #eef1f4;
}

.health-blurb {
	font-size: 0.74rem;
	line-height: 1.4;
	color: #8a8b8f;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.health-scores {
	display: flex;
	gap: 0.7rem;
	flex-shrink: 0;
}

.score {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.score-value {
	font-family: "JetBrains Mono", monospace;
	font-size: 0.85rem;
	color: #66c6ef;
}

.score-label {
	font-size: 0.6rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: #8a8b8f;
}

.dialog-framing,
.dialog-status,
.dialog-topfix {
	font-family: "Raleway", sans-serif;
	font-size: 0.92rem;
	line-height: 1.55;
	margin: 0 0 1rem;
}

.dialog-framing a {
	color: #1f8fc0;
}

.dialog-status {
	display: flex;
	align-items: flex-start;
	gap: 0.6rem;
}

.dialog-table {
	margin-bottom: 1rem;
}

.dialog-trend {
	display: flex;
	align-items: center;
	gap: 0.8rem;
}

.trend-label {
	font-family: "Raleway", sans-serif;
	font-size: 0.8rem;
	color: #6b7280;
}

@media (max-width: 700px) {
	.health-scores {
		display: none;
	}
}

/* The footer widget itself is already dark; only the dialog text needs help. */
html.dark .dialog-framing a {
	color: var(--dm-blue-soft);
}

html.dark .trend-label {
	color: var(--dm-text-3);
}
</style>
