<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Knob from 'primevue/knob'
import type { SimulationResult, TargetModel } from '../types/oracle'
import { formatUsd, stepCostRange } from '../config/pricing'

const props = defineProps<{ result: SimulationResult; targetModel: TargetModel }>()

// Single-hue magnitude chart: solid = expected low, translucent extension of
// the same hue = range up to high. Identity (which step) lives on the axis,
// not in color; risk state lives in the step cards, not here.
const BAR_SOLID = '#38bdf8'
const BAR_RANGE = 'rgba(56, 189, 248, 0.32)'
const INK_SECONDARY = '#94a3b8'
const INK_PRIMARY = '#cbd5e1'
const GRID = 'rgba(148, 163, 184, 0.14)'

const perStep = computed(() =>
  props.result.steps.map((s, i) => {
    const [low, high] = stepCostRange(s, props.targetModel)
    return { label: `Step ${i + 1}`, low, high }
  }),
)

const chartData = computed(() => ({
  labels: perStep.value.map((s) => s.label),
  datasets: [
    {
      label: 'Expected (low)',
      data: perStep.value.map((s) => s.low),
      backgroundColor: BAR_SOLID,
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.62,
    },
    {
      label: 'Range to high',
      data: perStep.value.map((s) => Math.max(0, s.high - s.low)),
      backgroundColor: BAR_RANGE,
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.62,
    },
  ],
}))

const chartOptions = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: INK_PRIMARY, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'rectRounded' },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { datasetIndex: number; dataIndex: number }) => {
          const step = perStep.value[ctx.dataIndex]
          if (!step) return ''
          return ctx.datasetIndex === 0
            ? ` Expected low: ${formatUsd(step.low)}`
            : ` Up to: ${formatUsd(step.high)}`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { color: GRID },
      ticks: {
        color: INK_SECONDARY,
        callback: (value: string | number) => formatUsd(Number(value)),
        maxTicksLimit: 6,
      },
      border: { display: false },
    },
    y: {
      stacked: true,
      grid: { display: false },
      ticks: { color: INK_SECONDARY },
      border: { display: false },
    },
  },
}))

const chartHeight = computed(() => `${Math.max(180, props.result.steps.length * 46 + 70)}px`)

const expectedHigh = computed(() => props.result.totalCostUsd[1])
const worstPct = computed(() => {
  if (props.result.worstCaseCostUsd <= 0) return 0
  return Math.min(100, Math.round((expectedHigh.value / props.result.worstCaseCostUsd) * 100))
})
</script>

<template>
  <section class="cost" aria-label="Cost breakdown">
    <h3 class="cost__title">Cost per step</h3>
    <div class="cost__grid">
      <div class="cost__chart" :style="{ height: chartHeight }">
        <Chart type="bar" :data="chartData" :options="chartOptions" class="cost__chart-canvas" />
      </div>
      <div class="cost__gauge">
        <Knob
          :model-value="worstPct"
          :size="120"
          readonly
          value-template="{value}%"
          value-color="#38bdf8"
          range-color="rgba(148, 163, 184, 0.25)"
          text-color="#cbd5e1"
        />
        <p class="cost__gauge-caption">
          Expected high is <strong>{{ worstPct }}%</strong> of the
          {{ formatUsd(props.result.worstCaseCostUsd) }} worst case — the gap is what loop risks would burn.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cost {
  background: var(--p-surface-900);
  border: 1px solid var(--p-surface-700);
  border-radius: 14px;
  padding: 1.2rem 1.4rem;
}
.cost__title {
  margin: 0 0 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--p-surface-200);
}
.cost__grid {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.cost__chart {
  flex: 1 1 320px;
  min-width: 0;
}
.cost__chart-canvas {
  height: 100%;
}
.cost__chart-canvas :deep(canvas) {
  max-width: 100%;
}
.cost__gauge {
  flex: 0 1 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}
.cost__gauge-caption {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-surface-400);
}
.cost__gauge-caption strong {
  color: var(--p-surface-100);
}
</style>
