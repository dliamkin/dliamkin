<script setup lang="ts">
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import type { HistoryEntry } from '../composables/useHistory'
import type { RiskLevel } from '../types/oracle'
import { formatUsd } from '../config/pricing'

const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{ entries: HistoryEntry[] }>()
const emit = defineEmits<{ restore: [entry: HistoryEntry]; clear: [] }>()

const RISK_ICON: Record<RiskLevel, { icon: string; class: string }> = {
  clear: { icon: 'pi pi-sun', class: 'risk-clear' },
  caution: { icon: 'pi pi-cloud', class: 'risk-caution' },
  storm: { icon: 'pi pi-bolt', class: 'risk-storm' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Drawer v-model:visible="visible" header="Past forecasts" position="right" class="history-drawer">
    <p v-if="props.entries.length === 0" class="history__empty">
      No forecasts yet. Run a dry-run and it will be remembered here (last 20).
    </p>

    <ul v-else class="history__list">
      <li v-for="entry in props.entries" :key="entry.id">
        <button type="button" class="history__item" @click="emit('restore', entry)">
          <i
            :class="[RISK_ICON[entry.overallRisk].icon, RISK_ICON[entry.overallRisk].class]"
            aria-hidden="true"
          />
          <span class="history__body">
            <span class="history__title">{{ entry.title }}</span>
            <span class="history__meta">
              {{ formatDate(entry.createdAt) }} ·
              {{ formatUsd(entry.totalCostUsd[0]) }}–{{ formatUsd(entry.totalCostUsd[1]) }}
            </span>
          </span>
          <i class="pi pi-angle-right history__chevron" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <template #footer>
      <Button
        v-if="props.entries.length"
        label="Clear history"
        icon="pi pi-trash"
        severity="danger"
        text
        @click="emit('clear')"
      />
    </template>
  </Drawer>
</template>

<style scoped>
.history__empty {
  color: var(--p-surface-400);
  font-size: 0.9rem;
}
.history__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.history__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.65rem 0.7rem;
  background: var(--p-surface-800);
  border: 1px solid var(--p-surface-700);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  transition: border-color 0.15s ease;
}
.history__item:hover {
  border-color: var(--p-primary-500);
}
.risk-clear {
  color: var(--p-green-500);
}
.risk-caution {
  color: var(--p-amber-400);
}
.risk-storm {
  color: var(--p-red-400);
}
.history__body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}
.history__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--p-surface-100);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history__meta {
  font-size: 0.75rem;
  color: var(--p-surface-400);
}
.history__chevron {
  color: var(--p-surface-500);
}
</style>
