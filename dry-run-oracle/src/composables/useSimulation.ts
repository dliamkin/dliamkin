import { computed, onBeforeUnmount, readonly, ref } from 'vue'
import type { SimulateRequestBody, SimulationResult } from '../types/oracle'
import { isSimulationResult } from '../types/oracle'
import { buildDemoSimulation, DEMO_DELAY_MS } from '../data/demoSimulation'
import { hashPlan, useSimCache } from './useSimCache'

const STATUS_LINES = [
  'Consulting the oracle…',
  'Reading the token tea leaves…',
  'Simulating step 3…',
  'Checking the retry-storm radar…',
  'Estimating context re-send growth…',
  'Pricing the worst case…',
]

export interface SimulationOutcome {
  result: SimulationResult
  fromCache: boolean
  demo: boolean
}

/**
 * Calls the proxy (or demo data), manages loading / error / cached state,
 * and rotates the loading status line.
 */
export function useSimulation() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const statusIndex = ref(0)
  const cache = useSimCache()

  let statusTimer: ReturnType<typeof setInterval> | undefined

  const statusText = computed(
    (): string => STATUS_LINES[statusIndex.value % STATUS_LINES.length] ?? 'Consulting the oracle…',
  )

  function startStatus(): void {
    statusIndex.value = 0
    statusTimer = setInterval(() => {
      statusIndex.value = (statusIndex.value + 1) % STATUS_LINES.length
    }, 1400)
  }

  function stopStatus(): void {
    if (statusTimer !== undefined) clearInterval(statusTimer)
    statusTimer = undefined
  }

  onBeforeUnmount(stopStatus)

  async function simulate(body: SimulateRequestBody, demoMode: boolean): Promise<SimulationOutcome | null> {
    error.value = null
    loading.value = true
    startStatus()
    try {
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS))
        return { result: buildDemoSimulation(), fromCache: false, demo: true }
      }

      // Cache by hash first — a hit costs zero tokens.
      const hash = await hashPlan(body)
      const cached = cache.get(hash)
      if (cached) {
        return { result: cached, fromCache: true, demo: false }
      }

      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const payload: unknown = await response.json().catch(() => undefined)

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : `The oracle returned an unexpected ${response.status}.`
        error.value = message
        return null
      }

      if (!isSimulationResult(payload)) {
        error.value = 'The oracle response failed validation — nothing was charged beyond the forecast itself.'
        return null
      }

      cache.set(hash, payload)
      return { result: payload, fromCache: false, demo: false }
    } catch {
      error.value = 'Could not reach the oracle server. Is `npm run dev` running both processes?'
      return null
    } finally {
      stopStatus()
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    statusText,
    simulate,
  }
}
