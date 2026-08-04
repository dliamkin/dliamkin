<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import ProgressBar from "primevue/progressbar";
import OracleRiskBadge from "./OracleRiskBadge.vue";
import {
	formatTokenCount,
	formatUsd,
	stepCostRange,
	type StepAssessment,
	type TargetModel,
} from "@/lib/dry-run-oracle";

const props = defineProps<{
	assessment: StepAssessment;
	description: string;
	index: number;
	targetModel: TargetModel;
	fixApplied: boolean;
}>();

const emit = defineEmits<{ applyFix: [stepId: string, fix: string] }>();

const costRange = computed(() => stepCostRange(props.assessment, props.targetModel));
const loopRiskPct = computed(() => Math.round(props.assessment.loopRisk * 100));
const loopRiskClass = computed(() =>
	props.assessment.loopRisk >= 0.6
		? "loop-high"
		: props.assessment.loopRisk >= 0.3
			? "loop-mid"
			: "loop-low",
);
</script>

<template>
	<article class="step-card" :data-risk="props.assessment.riskLevel">
		<header class="step-card__header">
			<span class="step-card__index">Step {{ props.index + 1 }}</span>
			<OracleRiskBadge :risk="props.assessment.riskLevel" />
		</header>

		<p class="step-card__description">{{ props.description }}</p>

		<ul v-if="props.assessment.failureModes.length" class="step-card__failures">
			<li v-for="(mode, i) in props.assessment.failureModes" :key="i">
				<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
				<span>{{ mode }}</span>
			</li>
		</ul>

		<div class="step-card__meters">
			<div class="step-card__loop" :class="loopRiskClass">
				<span class="step-card__meter-label">Loop risk {{ loopRiskPct }}%</span>
				<ProgressBar :value="loopRiskPct" :show-value="false" style="height: 6px" />
			</div>
			<dl class="step-card__stats">
				<div>
					<dt>Tokens in</dt>
					<dd>
						{{ formatTokenCount(props.assessment.predictedInputTokens[0]) }}&ndash;{{
							formatTokenCount(props.assessment.predictedInputTokens[1])
						}}
					</dd>
				</div>
				<div>
					<dt>Tokens out</dt>
					<dd>
						{{ formatTokenCount(props.assessment.predictedOutputTokens[0]) }}&ndash;{{
							formatTokenCount(props.assessment.predictedOutputTokens[1])
						}}
					</dd>
				</div>
				<div>
					<dt>Iterations</dt>
					<dd>&times;{{ props.assessment.predictedIterations }}</dd>
				</div>
				<div>
					<dt>Est. cost</dt>
					<dd>{{ formatUsd(costRange[0]) }}&ndash;{{ formatUsd(costRange[1]) }}</dd>
				</div>
			</dl>
		</div>

		<div v-if="props.assessment.suggestedFix" class="step-card__fix">
			<i class="fa-solid fa-wrench" aria-hidden="true"></i>
			<p>{{ props.assessment.suggestedFix }}</p>
			<Button
				:label="props.fixApplied ? 'Fix applied' : 'Apply fix'"
				:icon="props.fixApplied ? 'fa-solid fa-check' : 'fa-solid fa-wand-magic-sparkles'"
				size="small"
				severity="secondary"
				:disabled="props.fixApplied"
				@click="
					emit('applyFix', props.assessment.stepId, props.assessment.suggestedFix ?? '')
				"
			/>
		</div>
	</article>
</template>

<style scoped>
.step-card {
	background: #fff;
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-left: 3px solid #c4c2c7;
	border-radius: 10px;
	padding: 1rem 1.1rem;
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

.step-card[data-risk="clear"] {
	border-left-color: #4caf50;
}

.step-card[data-risk="caution"] {
	border-left-color: #f0a020;
}

.step-card[data-risk="storm"] {
	border-left-color: #e04b3a;
}

.step-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.step-card__index {
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #9b9aa0;
}

.step-card__description {
	margin: 0;
	line-height: 1.5;
	color: #414042;
	font-weight: 500;
}

.step-card__failures {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.step-card__failures li {
	display: flex;
	gap: 0.5rem;
	align-items: baseline;
	font-size: 0.88rem;
	color: #6b6a6d;
}

.step-card__failures i {
	font-size: 0.7rem;
	color: #9b9aa0;
	translate: 0 -1px;
}

.step-card__meters {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}

.step-card__loop {
	max-width: 240px;
}

.step-card__meter-label {
	display: block;
	font-size: 0.75rem;
	color: #6b6a6d;
	margin-bottom: 0.25rem;
}

.loop-high :deep(.p-progressbar-value) {
	background: #e04b3a;
}

.loop-mid :deep(.p-progressbar-value) {
	background: #f0a020;
}

.loop-low :deep(.p-progressbar-value) {
	background: #4caf50;
}

.step-card__stats {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem 1.4rem;
	margin: 0;
}

.step-card__stats div {
	min-width: 5.5rem;
}

.step-card__stats dt {
	font-size: 0.7rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #9b9aa0;
}

.step-card__stats dd {
	margin: 0;
	font-variant-numeric: tabular-nums;
	color: #414042;
	font-size: 0.9rem;
}

.step-card__fix {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.6rem;
	background: rgba(39, 169, 224, 0.07);
	border-radius: 8px;
	padding: 0.6rem 0.8rem;
}

.step-card__fix i {
	color: #1f8fc0;
}

.step-card__fix p {
	flex: 1 1 220px;
	margin: 0;
	font-size: 0.88rem;
	color: #414042;
}

html.dark .step-card {
	background: var(--dm-bg-soft);
	border-color: var(--dm-border);
}

html.dark .step-card[data-risk="clear"] {
	border-left-color: #5cb85c;
}

html.dark .step-card[data-risk="caution"] {
	border-left-color: #f2b13d;
}

html.dark .step-card[data-risk="storm"] {
	border-left-color: #ff6b6b;
}

html.dark .step-card__description,
html.dark .step-card__stats dd,
html.dark .step-card__fix p {
	color: var(--dm-text-1);
}

html.dark .step-card__failures li,
html.dark .step-card__meter-label {
	color: var(--dm-text-2);
}

html.dark .step-card__fix {
	background: rgba(102, 198, 239, 0.09);
}

html.dark .step-card__fix i {
	color: var(--dm-blue-soft);
}
</style>
