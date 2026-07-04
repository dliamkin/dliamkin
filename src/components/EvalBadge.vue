<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
	EVAL_LATEST_PATH,
	isEvalReport,
	type EvalProjectId,
	type SuiteResult,
} from "@/lib/evals";

// Small "Evals: N/M passing" pill shown next to each project's title, linking to
// the /evals dashboard. Reads the same static JSON the dashboard renders — no
// API, no key. Before the first eval run exists (or if the fetch fails), it
// renders nothing.

const props = defineProps<{ projectId: EvalProjectId }>();

const suite = ref<SuiteResult | null>(null);

onMounted(async () => {
	try {
		const response = await fetch(EVAL_LATEST_PATH);
		if (!response.ok || !response.headers.get("content-type")?.includes("json")) return;
		const data: unknown = await response.json();
		if (!isEvalReport(data)) return;
		suite.value = data.suites.find((s) => s.project_id === props.projectId) ?? null;
	} catch {
		// No results yet (or unreachable) — render nothing.
	}
});

const allPassing = computed(
	() => suite.value !== null && suite.value.pass_count === suite.value.total,
);
</script>

<template>
	<RouterLink
		v-if="suite"
		to="/evals"
		class="eval-badge"
		:class="allPassing ? 'passing' : 'failing'"
		:aria-label="`Evals: ${suite.pass_count} of ${suite.total} passing. Open the eval dashboard.`"
	>
		<i
			:class="allPassing ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"
			aria-hidden="true"
		></i>
		Evals: {{ suite.pass_count }}/{{ suite.total }} passing
	</RouterLink>
</template>

<style scoped>
.eval-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	font-family: "Raleway", sans-serif;
	font-size: 0.78rem;
	font-weight: 700;
	padding: 0.25rem 0.7rem;
	border-radius: 999px;
	text-decoration: none;
	transition: filter 0.2s ease;
}

.eval-badge:hover {
	filter: brightness(0.92);
}

.eval-badge.passing {
	color: #1b6e3d;
	background: #e3f4e9;
	border: 1px solid #b3dfc3;
}

.eval-badge.failing {
	color: #8a5a00;
	background: #fdf0d7;
	border: 1px solid #ecd7a3;
}
</style>
