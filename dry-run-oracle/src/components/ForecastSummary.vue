<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import type { RiskLevel, SimulationResult } from '../types/oracle'
import { formatUsd } from '../config/pricing'

const props = defineProps<{
  result: SimulationResult
  fromCache: boolean
  demo: boolean
}>()

const WEATHER: Record<RiskLevel, { icon: string; label: string; tone: string }> = {
  clear: { icon: 'pi pi-sun', label: 'Clear skies', tone: 'clear' },
  caution: { icon: 'pi pi-cloud', label: 'Clouds building', tone: 'caution' },
  storm: { icon: 'pi pi-bolt', label: 'Storm warning', tone: 'storm' },
}

const weather = computed(() => WEATHER[props.result.overallRisk])

const savings = computed(() => {
  const m = props.result.savingsMultiple
  if (m >= 100) return `${Math.round(m).toLocaleString('en-US')}×`
  if (m >= 10) return `${m.toFixed(0)}×`
  return `${m.toFixed(1)}×`
})
</script>

<template>
  <section class="forecast" :data-tone="weather.tone" aria-label="Forecast summary">
    <Message v-if="props.result.abortRecommended" severity="error" icon="pi pi-ban" class="forecast__abort">
      The oracle recommends <strong>aborting this plan as written</strong> — apply the suggested fixes or narrow the
      scope before spending a token.
    </Message>

    <div class="forecast__main">
      <div class="forecast__icon" aria-hidden="true">
        <i :class="weather.icon" />
      </div>
      <div class="forecast__body">
        <div class="forecast__meta">
          <span class="forecast__condition">{{ weather.label }}</span>
          <Tag v-if="props.demo" value="demo data" severity="info" icon="pi pi-eye" />
          <Tag v-else-if="props.fromCache" value="cached forecast — 0 tokens spent" severity="secondary" icon="pi pi-bolt" />
        </div>
        <h2 class="forecast__headline">{{ props.result.forecastHeadline }}</h2>
        <p class="forecast__cost">
          <span class="forecast__cost-figure">
            {{ formatUsd(props.result.totalCostUsd[0]) }}–{{ formatUsd(props.result.totalCostUsd[1]) }}
          </span>
          <span class="forecast__cost-caption">expected spend · worst case {{ formatUsd(props.result.worstCaseCostUsd) }}</span>
        </p>
        <p class="forecast__flex">
          <i class="pi pi-sparkles" aria-hidden="true" />
          This forecast cost {{ formatUsd(props.result.oracleCostUsd) }} — potentially saving you
          <strong>{{ savings }}</strong> that.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.forecast {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.forecast__abort {
  margin: 0;
}
.forecast__main {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  background: linear-gradient(140deg, var(--p-surface-900), var(--p-surface-950));
  border: 1px solid var(--p-surface-700);
  border-radius: 14px;
  padding: 1.4rem 1.5rem;
}
.forecast__icon {
  flex: 0 0 auto;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--p-surface-800);
}
.forecast__icon .pi {
  font-size: 1.9rem;
}
.forecast[data-tone='clear'] .forecast__icon .pi {
  color: var(--p-amber-300);
}
.forecast[data-tone='caution'] .forecast__icon .pi {
  color: var(--p-surface-300);
}
.forecast[data-tone='storm'] .forecast__icon .pi {
  color: var(--p-red-400);
}
.forecast__body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
}
.forecast__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.forecast__condition {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-surface-400);
}
.forecast__headline {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.4;
  font-weight: 600;
  color: var(--p-surface-50);
}
.forecast__cost {
  margin: 0.2rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.forecast__cost-figure {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--p-primary-300);
}
.forecast__cost-caption {
  font-size: 0.85rem;
  color: var(--p-surface-400);
}
.forecast__flex {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-surface-300);
}
.forecast__flex .pi {
  color: var(--p-primary-400);
  margin-right: 0.35rem;
}
.forecast__flex strong {
  color: var(--p-surface-100);
}

@media (max-width: 520px) {
  .forecast__main {
    flex-direction: column;
    gap: 0.9rem;
  }
  .forecast__cost-figure {
    font-size: 1.5rem;
  }
}
</style>
