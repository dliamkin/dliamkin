<script setup lang="ts">
// Editable per-step parameter table. Emits a fresh steps array on every edit
// (one-way data flow); the parent marks the scenario custom and re-simulates.
// Advanced params (loopDecay, retryContextGrowth) live in the expander row.
import { computed, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Slider from "primevue/slider";
import { formatPercent } from "@/lib/tail-risk/format";
import {
	DEFAULT_LOOP_DECAY,
	DEFAULT_RETRY_CONTEXT_GROWTH,
	MAX_STEPS,
	MIN_STEPS,
	type StepParams,
} from "@/lib/tail-risk/types";

const props = defineProps<{ steps: StepParams[] }>();

const emit = defineEmits<{
	"update:steps": [steps: StepParams[]];
}>();

const expandedRows = ref({});

function cloneSteps(): StepParams[] {
	return props.steps.map((s) => ({
		...s,
		inputTokensK: [...s.inputTokensK] as [number, number],
		outputTokensK: [...s.outputTokensK] as [number, number],
	}));
}

function patchStep(index: number, patch: Partial<StepParams>): void {
	const next = cloneSteps();
	const target = next[index];
	if (!target) return;
	next[index] = { ...target, ...patch };
	emit("update:steps", next);
}

function patchRange(
	index: number,
	field: "inputTokensK" | "outputTokensK",
	bound: 0 | 1,
	value: number | null,
): void {
	const current = props.steps[index];
	if (!current) return;
	const range = [...current[field]] as [number, number];
	range[bound] = Math.max(0, value ?? 0);
	patchStep(index, { [field]: range });
}

function riskPercent(step: StepParams): number {
	return Math.round(step.loopRisk * 100);
}

function patchRisk(index: number, value: number | number[]): void {
	const pct = Array.isArray(value) ? (value[0] ?? 0) : value;
	patchStep(index, { loopRisk: pct / 100 });
}

function moveStep(index: number, direction: -1 | 1): void {
	const next = cloneSteps();
	const target = index + direction;
	if (target < 0 || target >= next.length) return;
	const a = next[index];
	const b = next[target];
	if (!a || !b) return;
	next[index] = b;
	next[target] = a;
	emit("update:steps", next);
}

function removeStep(index: number): void {
	if (props.steps.length <= MIN_STEPS) return;
	const next = cloneSteps();
	next.splice(index, 1);
	emit("update:steps", next);
}

function addStep(): void {
	if (props.steps.length >= MAX_STEPS) return;
	const next = cloneSteps();
	next.push({
		id: `step-${Date.now().toString(36)}-${next.length}`,
		label: `Step ${next.length + 1}`,
		inputTokensK: [10, 20],
		outputTokensK: [2, 4],
		loopRisk: 0.1,
		loopDecay: DEFAULT_LOOP_DECAY,
		retryContextGrowth: DEFAULT_RETRY_CONTEXT_GROWTH,
	});
	emit("update:steps", next);
}

function rangeInvalid(step: StepParams, field: "inputTokensK" | "outputTokensK"): boolean {
	return step[field][0] > step[field][1];
}

const invalidLabels = computed(() =>
	props.steps
		.filter((s) => rangeInvalid(s, "inputTokensK") || rangeInvalid(s, "outputTokensK"))
		.map((s) => s.label),
);
</script>

<template>
	<div class="param-table">
		<div class="table-scroll">
			<DataTable
				v-model:expanded-rows="expandedRows"
				:value="steps"
				data-key="id"
				size="small"
				class="steps-table"
			>
				<Column expander header-style="width: 2.5rem" />
				<Column header="Step">
					<template #body="{ data, index }">
						<InputText
							:model-value="data.label"
							size="small"
							class="label-input"
							:aria-label="`Step ${index + 1} label`"
							@update:model-value="patchStep(index, { label: $event ?? '' })"
						/>
					</template>
				</Column>
				<Column header="Input tokens (K)">
					<template #body="{ data, index }">
						<div class="range-pair">
							<InputNumber
								:model-value="data.inputTokensK[0]"
								:min="0"
								:max-fraction-digits="1"
								:invalid="rangeInvalid(data, 'inputTokensK')"
								size="small"
								:input-style="{ width: '4.2rem' }"
								:aria-label="`${data.label} input low`"
								@update:model-value="patchRange(index, 'inputTokensK', 0, $event)"
							/>
							<span class="range-dash">–</span>
							<InputNumber
								:model-value="data.inputTokensK[1]"
								:min="0"
								:max-fraction-digits="1"
								:invalid="rangeInvalid(data, 'inputTokensK')"
								size="small"
								:input-style="{ width: '4.2rem' }"
								:aria-label="`${data.label} input high`"
								@update:model-value="patchRange(index, 'inputTokensK', 1, $event)"
							/>
						</div>
					</template>
				</Column>
				<Column header="Output tokens (K)">
					<template #body="{ data, index }">
						<div class="range-pair">
							<InputNumber
								:model-value="data.outputTokensK[0]"
								:min="0"
								:max-fraction-digits="1"
								:invalid="rangeInvalid(data, 'outputTokensK')"
								size="small"
								:input-style="{ width: '4.2rem' }"
								:aria-label="`${data.label} output low`"
								@update:model-value="patchRange(index, 'outputTokensK', 0, $event)"
							/>
							<span class="range-dash">–</span>
							<InputNumber
								:model-value="data.outputTokensK[1]"
								:min="0"
								:max-fraction-digits="1"
								:invalid="rangeInvalid(data, 'outputTokensK')"
								size="small"
								:input-style="{ width: '4.2rem' }"
								:aria-label="`${data.label} output high`"
								@update:model-value="patchRange(index, 'outputTokensK', 1, $event)"
							/>
						</div>
					</template>
				</Column>
				<Column header="Loop risk">
					<template #body="{ data, index }">
						<div class="risk-cell">
							<Slider
								:model-value="riskPercent(data)"
								:min="0"
								:max="100"
								:step="1"
								class="risk-slider"
								:aria-label="`${data.label} loop risk`"
								@update:model-value="patchRisk(index, $event)"
							/>
							<span class="risk-value">{{ formatPercent(data.loopRisk, 0) }}</span>
						</div>
					</template>
				</Column>
				<Column header-style="width: 7rem">
					<template #body="{ index }">
						<div class="row-actions">
							<Button
								icon="fa-solid fa-arrow-up"
								severity="secondary"
								text
								size="small"
								:disabled="index === 0"
								aria-label="Move step up"
								@click="moveStep(index, -1)"
							/>
							<Button
								icon="fa-solid fa-arrow-down"
								severity="secondary"
								text
								size="small"
								:disabled="index === steps.length - 1"
								aria-label="Move step down"
								@click="moveStep(index, 1)"
							/>
							<Button
								icon="fa-solid fa-trash-can"
								severity="secondary"
								text
								size="small"
								:disabled="steps.length <= MIN_STEPS"
								aria-label="Remove step"
								@click="removeStep(index)"
							/>
						</div>
					</template>
				</Column>

				<template #expansion="{ data, index }">
					<div class="advanced-row">
						<div class="advanced-field">
							<label :for="`decay-${data.id}`">
								Loop decay
								<span class="advanced-hint">P(retry k) = risk · decay^(k−1)</span>
							</label>
							<InputNumber
								:input-id="`decay-${data.id}`"
								:model-value="data.loopDecay"
								:min="0"
								:max="1"
								:step="0.01"
								:max-fraction-digits="2"
								size="small"
								:input-style="{ width: '5rem' }"
								@update:model-value="
									patchStep(index, { loopDecay: $event ?? DEFAULT_LOOP_DECAY })
								"
							/>
						</div>
						<div class="advanced-field">
							<label :for="`growth-${data.id}`">
								Retry context growth
								<span class="advanced-hint"
									>retry k re-sends input × (1 + growth·k)</span
								>
							</label>
							<InputNumber
								:input-id="`growth-${data.id}`"
								:model-value="data.retryContextGrowth"
								:min="0"
								:max="2"
								:step="0.05"
								:max-fraction-digits="2"
								size="small"
								:input-style="{ width: '5rem' }"
								@update:model-value="
									patchStep(index, {
										retryContextGrowth: $event ?? DEFAULT_RETRY_CONTEXT_GROWTH,
									})
								"
							/>
						</div>
					</div>
				</template>
			</DataTable>
		</div>

		<p v-if="invalidLabels.length" class="validation-error" role="alert">
			<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
			Low bound exceeds high bound on: {{ invalidLabels.join(", ") }}. The engine treats the
			pair as [min, max] until fixed.
		</p>

		<Button
			label="Add step"
			icon="fa-solid fa-plus"
			severity="secondary"
			outlined
			size="small"
			class="add-step"
			:disabled="steps.length >= MAX_STEPS"
			@click="addStep"
		/>
		<span v-if="steps.length >= MAX_STEPS" class="max-hint">Max {{ MAX_STEPS }} steps.</span>
	</div>
</template>

<style scoped>
.table-scroll {
	overflow-x: auto;
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-radius: 10px;
}

.steps-table {
	min-width: 720px;
}

.range-pair {
	display: flex;
	align-items: center;
	gap: 0.3rem;
}

.range-dash {
	color: #6b6a6d;
}

.risk-cell {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 130px;
}

.risk-slider {
	flex: 1;
	min-width: 70px;
}

.risk-value {
	font-size: 0.82rem;
	font-variant-numeric: tabular-nums;
	color: #6b6a6d;
	width: 2.6rem;
	text-align: right;
}

.row-actions {
	display: flex;
	gap: 0.1rem;
}

.label-input {
	width: 100%;
	min-width: 9rem;
}

.advanced-row {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem 2.5rem;
	padding: 0.5rem 0.5rem 0.5rem 2.5rem;
}

.advanced-field {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.advanced-field > label {
	font-size: 0.78rem;
	font-weight: 600;
	color: #414042;
}

.advanced-hint {
	display: block;
	font-weight: 400;
	color: #6b6a6d;
	font-size: 0.74rem;
}

.validation-error {
	margin-top: 0.6rem;
	font-size: 0.85rem;
	color: #b03a2e;
}

.validation-error i {
	margin-right: 0.35rem;
}

.add-step {
	margin-top: 0.75rem;
}

.max-hint {
	font-size: 0.8rem;
	color: #6b6a6d;
	margin-left: 0.6rem;
}

html.dark .table-scroll {
	border-color: var(--dm-border);
}

html.dark .range-dash,
html.dark .risk-value,
html.dark .advanced-hint,
html.dark .max-hint {
	color: var(--dm-text-3);
}

html.dark .advanced-field > label {
	color: var(--dm-text-2);
}

html.dark .validation-error {
	color: #ef8b7f;
}
</style>
