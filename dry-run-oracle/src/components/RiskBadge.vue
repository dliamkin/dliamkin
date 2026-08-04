<script setup lang="ts">
import Tag from 'primevue/tag'
import type { RiskLevel } from '../types/oracle'

const props = defineProps<{ risk: RiskLevel }>()

const META: Record<RiskLevel, { severity: 'success' | 'warn' | 'danger'; icon: string; text: string }> = {
  clear: { severity: 'success', icon: 'pi pi-sun', text: 'Clear' },
  caution: { severity: 'warn', icon: 'pi pi-cloud', text: 'Caution' },
  storm: { severity: 'danger', icon: 'pi pi-bolt', text: 'Storm' },
}
</script>

<template>
  <Tag :severity="META[props.risk].severity" :icon="META[props.risk].icon" :value="META[props.risk].text" />
</template>
