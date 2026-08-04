<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import ProgressBar from 'primevue/progressbar'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import type { AgentPlan, SimulateRequestBody, TargetModel } from '../types/oracle'
import { TARGET_MODEL_LABELS } from '../config/pricing'

const props = defineProps<{ plan: AgentPlan; loading: boolean; statusText: string }>()
const emit = defineEmits<{ submit: [body: SimulateRequestBody] }>()

type InputMode = 'structured' | 'freeform'
const mode = ref<InputMode>('structured')
const MODE_OPTIONS: { label: string; value: InputMode }[] = [
  { label: 'Structured', value: 'structured' },
  { label: 'Paste freeform', value: 'freeform' },
]

const freeformText = ref('')

const MODEL_OPTIONS = (Object.entries(TARGET_MODEL_LABELS) as [TargetModel, string][]).map(
  ([value, label]) => ({ value, label }),
)

const TOOL_PRESETS = [
  'web_search',
  'file_read',
  'file_write',
  'bash',
  'grep',
  'code_execution',
  'git',
  'browser',
  'sql',
].map((t) => ({ label: t, value: t }))

function addStep(): void {
  props.plan.steps.push({ id: crypto.randomUUID(), description: '' })
}

function removeStep(index: number): void {
  props.plan.steps.splice(index, 1)
}

function moveStep(index: number, delta: -1 | 1): void {
  const target = index + delta
  if (target < 0 || target >= props.plan.steps.length) return
  const steps = props.plan.steps
  const [step] = steps.splice(index, 1)
  if (step) steps.splice(target, 0, step)
}

const canSubmit = computed(() => {
  if (props.loading) return false
  if (props.plan.title.trim() === '') return false
  if (mode.value === 'freeform') return freeformText.value.trim().length > 0
  return props.plan.steps.length > 0 && props.plan.steps.every((s) => s.description.trim() !== '')
})

function submit(): void {
  if (!canSubmit.value) return
  const body: SimulateRequestBody = {
    title: props.plan.title.trim(),
    targetModel: props.plan.targetModel,
  }
  const notes = props.plan.contextNotes?.trim()
  if (notes) body.contextNotes = notes
  if (mode.value === 'freeform') {
    body.freeform = freeformText.value.trim()
  } else {
    body.steps = props.plan.steps.map((s) => ({ ...s, description: s.description.trim() }))
  }
  emit('submit', body)
}

defineExpose({
  setFreeform(text: string) {
    freeformText.value = text
  },
  setMode(value: InputMode) {
    mode.value = value
  },
})
</script>

<template>
  <section class="plan-input" aria-label="Plan input">
    <div class="plan-input__row plan-input__row--head">
      <div class="plan-input__field plan-input__field--grow">
        <label for="plan-title">Plan title</label>
        <InputText id="plan-title" v-model="props.plan.title" placeholder="e.g. Refactor auth module across 40 files" />
      </div>
      <div class="plan-input__field">
        <label for="plan-model">Target model</label>
        <Select
          id="plan-model"
          v-model="props.plan.targetModel"
          :options="MODEL_OPTIONS"
          option-label="label"
          option-value="value"
        />
      </div>
    </div>

    <SelectButton
      v-model="mode"
      :options="MODE_OPTIONS"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Input mode"
    />

    <div v-if="mode === 'structured'" class="plan-input__steps">
      <div v-for="(step, i) in props.plan.steps" :key="step.id" class="plan-step">
        <div class="plan-step__order">
          <span class="plan-step__number">{{ i + 1 }}</span>
          <Button
            icon="pi pi-chevron-up"
            text
            rounded
            size="small"
            severity="secondary"
            :disabled="i === 0"
            aria-label="Move step up"
            @click="moveStep(i, -1)"
          />
          <Button
            icon="pi pi-chevron-down"
            text
            rounded
            size="small"
            severity="secondary"
            :disabled="i === props.plan.steps.length - 1"
            aria-label="Move step down"
            @click="moveStep(i, 1)"
          />
        </div>
        <div class="plan-step__fields">
          <Textarea
            v-model="step.description"
            auto-resize
            rows="2"
            placeholder="What will the agent do in this step?"
          />
          <div class="plan-step__meta">
            <MultiSelect
              v-model="step.tools"
              :options="TOOL_PRESETS"
              option-label="label"
              option-value="value"
              placeholder="Tools"
              display="chip"
              :show-toggle-all="false"
              class="plan-step__tools"
            />
            <InputNumber
              v-model="step.expectedIterations"
              :min="1"
              :max="50"
              show-buttons
              placeholder="Iterations"
              input-class="plan-step__iters"
              :aria-label="`Expected iterations for step ${i + 1}`"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              aria-label="Remove step"
              :disabled="props.plan.steps.length === 1"
              @click="removeStep(i)"
            />
          </div>
        </div>
      </div>
      <Button label="Add step" icon="pi pi-plus" text @click="addStep" />
    </div>

    <div v-else class="plan-input__field">
      <label for="plan-freeform">Paste your messy plan — the oracle will structure it</label>
      <Textarea
        id="plan-freeform"
        v-model="freeformText"
        rows="8"
        auto-resize
        placeholder="Paste a plan, a ticket, a Slack message… the oracle infers the steps."
      />
    </div>

    <div class="plan-input__field">
      <label for="plan-notes">Context notes <span class="plan-input__optional">(optional)</span></label>
      <Textarea
        id="plan-notes"
        v-model="props.plan.contextNotes"
        rows="2"
        auto-resize
        placeholder="Codebase size, data volume, constraints…"
      />
    </div>

    <div class="plan-input__submit">
      <Button
        label="Run Dry-Run"
        icon="pi pi-cloud-download"
        size="large"
        :disabled="!canSubmit"
        :loading="props.loading"
        @click="submit"
      />
      <div v-if="props.loading" class="plan-input__progress" role="status">
        <ProgressBar mode="indeterminate" style="height: 5px" />
        <span class="plan-input__status">{{ props.statusText }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.plan-input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--p-surface-900);
  border: 1px solid var(--p-surface-700);
  border-radius: 14px;
  padding: 1.3rem 1.4rem;
}
.plan-input__row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.plan-input__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.plan-input__field--grow {
  flex: 1 1 260px;
}
.plan-input__field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-surface-300);
}
.plan-input__optional {
  font-weight: 400;
  color: var(--p-surface-500);
}
.plan-input__steps {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.plan-step {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
}
.plan-step__order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding-top: 0.2rem;
}
.plan-step__number {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--p-surface-400);
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--p-surface-800);
}
.plan-step__fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.plan-step__meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.plan-step__tools {
  flex: 1 1 180px;
  max-width: 100%;
}
:deep(.plan-step__iters) {
  width: 6.5rem;
}
.plan-input__submit {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.plan-input__progress {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.plan-input__status {
  font-size: 0.85rem;
  color: var(--p-primary-300);
  font-style: italic;
}
@media (max-width: 480px) {
  .plan-input {
    padding: 1rem;
  }
  .plan-step {
    flex-direction: column;
  }
  .plan-step__order {
    flex-direction: row;
  }
}
</style>
