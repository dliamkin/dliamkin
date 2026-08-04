<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import RiskBadge from './RiskBadge.vue'
import type { StepAssessment, TargetModel } from '../types/oracle'
import { formatTokens, formatUsd, stepCostRange } from '../config/pricing'

const props = defineProps<{
  assessment: StepAssessment
  description: string
  index: number
  targetModel: TargetModel
  fixApplied: boolean
}>()

const emit = defineEmits<{ applyFix: [stepId: string, fix: string] }>()

const costRange = computed(() => stepCostRange(props.assessment, props.targetModel))
const loopRiskPct = computed(() => Math.round(props.assessment.loopRisk * 100))
const loopRiskClass = computed(() =>
  props.assessment.loopRisk >= 0.6 ? 'loop-high' : props.assessment.loopRisk >= 0.3 ? 'loop-mid' : 'loop-low',
)
</script>

<template>
  <article class="step-card" :data-risk="props.assessment.riskLevel">
    <header class="step-card__header">
      <span class="step-card__index">Step {{ props.index + 1 }}</span>
      <RiskBadge :risk="props.assessment.riskLevel" />
    </header>

    <p class="step-card__description">{{ props.description }}</p>

    <ul v-if="props.assessment.failureModes.length" class="step-card__failures">
      <li v-for="(mode, i) in props.assessment.failureModes" :key="i">
        <i class="pi pi-exclamation-circle" aria-hidden="true" />
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
            {{ formatTokens(props.assessment.predictedInputTokens[0]) }}–{{
              formatTokens(props.assessment.predictedInputTokens[1])
            }}
          </dd>
        </div>
        <div>
          <dt>Tokens out</dt>
          <dd>
            {{ formatTokens(props.assessment.predictedOutputTokens[0]) }}–{{
              formatTokens(props.assessment.predictedOutputTokens[1])
            }}
          </dd>
        </div>
        <div>
          <dt>Iterations</dt>
          <dd>×{{ props.assessment.predictedIterations }}</dd>
        </div>
        <div>
          <dt>Est. cost</dt>
          <dd>{{ formatUsd(costRange[0]) }}–{{ formatUsd(costRange[1]) }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="props.assessment.suggestedFix" class="step-card__fix">
      <i class="pi pi-wrench" aria-hidden="true" />
      <p>{{ props.assessment.suggestedFix }}</p>
      <Button
        :label="props.fixApplied ? 'Fix applied' : 'Apply fix'"
        :icon="props.fixApplied ? 'pi pi-check' : 'pi pi-sparkles'"
        size="small"
        severity="secondary"
        :disabled="props.fixApplied"
        @click="emit('applyFix', props.assessment.stepId, props.assessment.suggestedFix ?? '')"
      />
    </div>
  </article>
</template>

<style scoped>
.step-card {
  background: var(--p-surface-900);
  border: 1px solid var(--p-surface-700);
  border-left: 3px solid var(--p-surface-600);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.step-card[data-risk='caution'] {
  border-left-color: var(--p-amber-500);
}
.step-card[data-risk='storm'] {
  border-left-color: var(--p-red-500);
}
.step-card[data-risk='clear'] {
  border-left-color: var(--p-green-600);
}
.step-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.step-card__index {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-surface-400);
}
.step-card__description {
  margin: 0;
  line-height: 1.45;
  color: var(--p-surface-100);
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
  color: var(--p-surface-300);
}
.step-card__failures .pi {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  translate: 0 1px;
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
  color: var(--p-surface-400);
  margin-bottom: 0.25rem;
}
.loop-high :deep(.p-progressbar-value) {
  background: var(--p-red-500);
}
.loop-mid :deep(.p-progressbar-value) {
  background: var(--p-amber-500);
}
.loop-low :deep(.p-progressbar-value) {
  background: var(--p-green-600);
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
  color: var(--p-surface-500);
}
.step-card__stats dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--p-surface-200);
  font-size: 0.9rem;
}
.step-card__fix {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  background: var(--p-surface-800);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
}
.step-card__fix .pi-wrench {
  color: var(--p-primary-400);
}
.step-card__fix p {
  flex: 1 1 220px;
  margin: 0;
  font-size: 0.88rem;
  color: var(--p-surface-200);
}
</style>
