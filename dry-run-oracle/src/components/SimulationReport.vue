<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Timeline from 'primevue/timeline'
import ForecastSummary from './ForecastSummary.vue'
import StepCard from './StepCard.vue'
import CostBreakdown from './CostBreakdown.vue'
import type { AgentPlan, RiskLevel, SimulationResult, StepAssessment } from '../types/oracle'

const props = defineProps<{
  result: SimulationResult
  plan: AgentPlan
  fromCache: boolean
  demo: boolean
  stale: boolean
  appliedFixes: ReadonlySet<string>
}>()

const emit = defineEmits<{
  approve: []
  edit: []
  abort: []
  applyFix: [stepId: string, fix: string]
}>()

interface TimelineItem {
  assessment: StepAssessment
  description: string
  index: number
}

const items = computed<TimelineItem[]>(() =>
  props.result.steps.map((assessment, index) => ({
    assessment,
    description:
      props.plan.steps.find((s) => s.id === assessment.stepId)?.description ?? `Step ${index + 1}`,
    index,
  })),
)

const MARKER: Record<RiskLevel, string> = {
  clear: 'pi pi-sun',
  caution: 'pi pi-cloud',
  storm: 'pi pi-bolt',
}
</script>

<template>
  <section class="report" aria-label="Simulation report">
    <Message v-if="props.stale" severity="warn" icon="pi pi-history" class="report__stale">
      The plan changed since this forecast — hit <strong>Edit &amp; Re-run</strong> for fresh numbers.
    </Message>

    <ForecastSummary :result="props.result" :from-cache="props.fromCache" :demo="props.demo" />

    <Timeline :value="items" class="report__timeline">
      <template #marker="{ item }">
        <span class="report__marker" :data-risk="(item as TimelineItem).assessment.riskLevel">
          <i :class="MARKER[(item as TimelineItem).assessment.riskLevel]" aria-hidden="true" />
        </span>
      </template>
      <template #content="{ item }">
        <StepCard
          :assessment="(item as TimelineItem).assessment"
          :description="(item as TimelineItem).description"
          :index="(item as TimelineItem).index"
          :target-model="props.plan.targetModel"
          :fix-applied="props.appliedFixes.has((item as TimelineItem).assessment.stepId)"
          @apply-fix="(stepId, fix) => emit('applyFix', stepId, fix)"
        />
      </template>
    </Timeline>

    <CostBreakdown :result="props.result" :target-model="props.plan.targetModel" />

    <div class="report__actions">
      <Button label="Approve" icon="pi pi-check" severity="success" @click="emit('approve')" />
      <Button label="Edit & Re-run" icon="pi pi-pencil" severity="secondary" @click="emit('edit')" />
      <Button label="Abort" icon="pi pi-times" severity="danger" outlined @click="emit('abort')" />
    </div>
  </section>
</template>

<style scoped>
.report {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.report__stale {
  margin: 0;
}
.report__timeline :deep(.p-timeline-event-opposite) {
  display: none;
}
.report__timeline :deep(.p-timeline-event-content) {
  padding-bottom: 1rem;
  min-width: 0;
}
.report__marker {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--p-surface-800);
  border: 1px solid var(--p-surface-600);
}
.report__marker[data-risk='clear'] .pi {
  color: var(--p-green-500);
}
.report__marker[data-risk='caution'] .pi {
  color: var(--p-amber-400);
}
.report__marker[data-risk='storm'] .pi {
  color: var(--p-red-400);
}
.report__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
@media (max-width: 420px) {
  .report__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
