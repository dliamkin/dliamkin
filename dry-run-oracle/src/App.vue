<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import PlanInput from './components/PlanInput.vue'
import SimulationReport from './components/SimulationReport.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import { useSimulation } from './composables/useSimulation'
import { useHistory, type HistoryEntry } from './composables/useHistory'
import { DEMO_PLAN } from './data/demoSimulation'
import type { AgentPlan, PlanStep, SimulateRequestBody, SimulationResult } from './types/oracle'

const toast = useToast()
const { loading, error, statusText, simulate } = useSimulation()
const history = useHistory()

function blankStep(): PlanStep {
  return { id: crypto.randomUUID(), description: '' }
}

const plan = reactive<AgentPlan>({
  title: '',
  targetModel: 'claude-opus',
  steps: [blankStep()],
  contextNotes: '',
})

const result = ref<SimulationResult | null>(null)
const ranPlan = ref<AgentPlan | null>(null) // snapshot of the plan the report was built from
const fromCache = ref(false)
const isDemoResult = ref(false)
const stale = ref(false)
const appliedFixes = ref<Set<string>>(new Set())

const demoMode = ref(import.meta.env.VITE_DEMO_MODE === 'true')
const historyOpen = ref(false)

const inputRef = ref<InstanceType<typeof PlanInput> | null>(null)
const inputSection = ref<HTMLElement | null>(null)

let suppressStale = false

onMounted(async () => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return // explicit override wins
  try {
    const res = await fetch('/api/health')
    const health: unknown = await res.json()
    const hasKey =
      typeof health === 'object' && health !== null && 'hasKey' in health && health.hasKey === true
    if (!hasKey) demoMode.value = true
  } catch {
    demoMode.value = true // no server reachable → demo is all we can offer
  }
})

watch(plan, () => {
  if (result.value && !suppressStale) stale.value = true
})

watch(error, (message) => {
  if (message) {
    toast.add({ severity: 'error', summary: 'Forecast failed', detail: message, life: 6000 })
  }
})

function replacePlan(next: AgentPlan): void {
  suppressStale = true
  plan.title = next.title
  plan.targetModel = next.targetModel
  plan.contextNotes = next.contextNotes ?? ''
  plan.steps.splice(0, plan.steps.length, ...next.steps.map((s) => ({ ...s, tools: s.tools ? [...s.tools] : undefined })))
  queueMicrotask(() => {
    suppressStale = false
  })
}

async function onSubmit(body: SimulateRequestBody): Promise<void> {
  const outcome = await simulate(body, demoMode.value)
  if (!outcome) return

  result.value = outcome.result
  fromCache.value = outcome.fromCache
  isDemoResult.value = outcome.demo
  stale.value = false
  appliedFixes.value = new Set()

  // The plan the report describes: for demo runs the canned plan, for freeform
  // submissions the oracle-inferred structure, otherwise the structured input.
  let snapshot: AgentPlan
  if (outcome.demo) {
    snapshot = structuredClone(DEMO_PLAN)
  } else if (outcome.result.inferredPlan) {
    snapshot = structuredClone(outcome.result.inferredPlan)
  } else {
    snapshot = {
      title: body.title,
      targetModel: body.targetModel,
      steps: structuredClone(body.steps ?? []),
    }
    if (body.contextNotes) snapshot.contextNotes = body.contextNotes
  }
  ranPlan.value = snapshot

  // Pre-fill the editor with the structured plan so Edit & Re-run just works.
  replacePlan(structuredClone(snapshot))
  inputRef.value?.setMode('structured')

  history.add(snapshot, outcome.result)
}

function runDemo(): void {
  demoMode.value = true
  replacePlan(structuredClone(DEMO_PLAN))
  void onSubmit({
    title: DEMO_PLAN.title,
    targetModel: DEMO_PLAN.targetModel,
    contextNotes: DEMO_PLAN.contextNotes,
    steps: structuredClone(DEMO_PLAN.steps),
  })
}

function onApplyFix(stepId: string, fix: string): void {
  const step = plan.steps.find((s) => s.id === stepId)
  if (!step || !fix) return
  step.description = `${step.description.replace(/\s+$/, '')} — constraint: ${fix}`
  appliedFixes.value = new Set([...appliedFixes.value, stepId])
  stale.value = true
  toast.add({
    severity: 'info',
    summary: 'Fix applied',
    detail: 'Step updated in the plan editor. Re-run for a fresh forecast.',
    life: 4000,
  })
}

async function onApprove(): Promise<void> {
  const approved = ranPlan.value ?? plan
  const clean: AgentPlan = {
    title: plan.title,
    targetModel: plan.targetModel,
    steps: plan.steps.map((s) => {
      const step: PlanStep = { id: s.id, description: s.description }
      if (s.tools && s.tools.length > 0) step.tools = [...s.tools]
      if (s.expectedIterations !== undefined) step.expectedIterations = s.expectedIterations
      return step
    }),
  }
  const notes = plan.contextNotes?.trim()
  if (notes) clean.contextNotes = notes
  try {
    await navigator.clipboard.writeText(JSON.stringify(clean, null, 2))
    toast.add({
      severity: 'success',
      summary: 'Plan approved',
      detail: `“${approved.title}” copied as JSON — go spend those tokens wisely.`,
      life: 4500,
    })
  } catch {
    toast.add({ severity: 'warn', summary: 'Clipboard unavailable', detail: 'Copy blocked by the browser.', life: 4000 })
  }
}

function onEdit(): void {
  inputSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onAbort(): void {
  result.value = null
  ranPlan.value = null
  stale.value = false
  appliedFixes.value = new Set()
  replacePlan({ title: '', targetModel: plan.targetModel, steps: [blankStep()], contextNotes: '' })
  toast.add({ severity: 'info', summary: 'Aborted', detail: 'Crisis averted.', life: 4000 })
}

function onRestore(entry: HistoryEntry): void {
  historyOpen.value = false
  result.value = entry.result
  ranPlan.value = structuredClone(entry.plan)
  fromCache.value = false
  isDemoResult.value = entry.result.planHash === 'demo'
  stale.value = false
  appliedFixes.value = new Set()
  replacePlan(structuredClone(entry.plan))
}
</script>

<template>
  <Toast position="bottom-right" />

  <div class="shell">
    <header class="shell__header">
      <div class="shell__brand">
        <i class="pi pi-cloud shell__logo" aria-hidden="true" />
        <div>
          <h1>Dry-Run Oracle</h1>
          <p>A weather forecast for AI spend — simulate the plan before the expensive model runs it.</p>
        </div>
      </div>
      <div class="shell__controls">
        <label class="shell__demo">
          <ToggleSwitch v-model="demoMode" aria-label="Demo mode" />
          <span>Demo</span>
        </label>
        <Button
          icon="pi pi-history"
          label="History"
          severity="secondary"
          outlined
          size="small"
          @click="historyOpen = true"
        />
      </div>
    </header>

    <main class="shell__main">
      <section ref="inputSection" class="shell__zone">
        <PlanInput ref="inputRef" :plan="plan" :loading="loading" :status-text="statusText" @submit="onSubmit" />
      </section>

      <section v-if="result && ranPlan" class="shell__zone">
        <SimulationReport
          :result="result"
          :plan="ranPlan"
          :from-cache="fromCache"
          :demo="isDemoResult"
          :stale="stale"
          :applied-fixes="appliedFixes"
          @approve="onApprove"
          @edit="onEdit"
          @abort="onAbort"
          @apply-fix="onApplyFix"
        />
      </section>

      <section v-else-if="!loading" class="shell__zone empty">
        <i class="pi pi-compass empty__icon" aria-hidden="true" />
        <h2>Check the weather before you fly</h2>
        <p>
          Paste an agent plan above and a cheap model (Claude Haiku) simulates it — predicting failure points,
          retry loops, and the token bill per step — <em>before</em> a single expensive token burns. Spending
          ~$0.01 to avoid wasting $5+ is the best trade in the business.
        </p>
        <Button label="Try the demo" icon="pi pi-play" @click="runDemo" />
      </section>
    </main>

    <footer class="shell__footer">
      <span>Oracle runs on Claude Haiku · forecasts capped at 1,500 output tokens · cached plans cost 0</span>
    </footer>
  </div>

  <HistoryDrawer
    v-model:visible="historyOpen"
    :entries="history.entries.value"
    @restore="onRestore"
    @clear="history.clear()"
  />
</template>

<style scoped>
.shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 1.6rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}
.shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.shell__brand {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
}
.shell__logo {
  font-size: 1.9rem;
  color: var(--p-primary-400);
  margin-top: 0.2rem;
}
.shell__brand h1 {
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.01em;
}
.shell__brand p {
  margin: 0.2rem 0 0;
  color: var(--p-surface-400);
  font-size: 0.9rem;
  max-width: 34rem;
}
.shell__controls {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.shell__demo {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: var(--p-surface-300);
  cursor: pointer;
}
.shell__main {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}
.empty {
  text-align: center;
  border: 1px dashed var(--p-surface-700);
  border-radius: 14px;
  padding: 2.4rem 1.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}
.empty__icon {
  font-size: 2rem;
  color: var(--p-primary-400);
}
.empty h2 {
  margin: 0;
  font-size: 1.15rem;
}
.empty p {
  margin: 0;
  max-width: 36rem;
  color: var(--p-surface-400);
  font-size: 0.92rem;
  line-height: 1.55;
}
.shell__footer {
  text-align: center;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
@media (max-width: 480px) {
  .shell {
    padding: 1rem 0.7rem 2rem;
  }
}
</style>
