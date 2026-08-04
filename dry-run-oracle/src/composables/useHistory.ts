import { ref } from 'vue'
import type { AgentPlan, RiskLevel, SimulationResult } from '../types/oracle'
import { isSimulationResult } from '../types/oracle'

/** Past simulations, newest first, capped at 20 entries in localStorage. */

const HISTORY_KEY = 'dro:history:v1'
const MAX_ENTRIES = 20

export interface HistoryEntry {
  id: string
  title: string
  createdAt: string
  overallRisk: RiskLevel
  totalCostUsd: [number, number]
  plan: AgentPlan
  result: SimulationResult
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.createdAt === 'string' &&
    typeof r.plan === 'object' &&
    r.plan !== null &&
    isSimulationResult(r.result)
  )
}

function read(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHistoryEntry)
  } catch {
    return []
  }
}

function write(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // best-effort
  }
}

export function useHistory() {
  const entries = ref<HistoryEntry[]>(read())

  function add(plan: AgentPlan, result: SimulationResult): void {
    const entry: HistoryEntry = {
      id: `${result.planHash}-${result.createdAt}`,
      title: plan.title,
      createdAt: result.createdAt,
      overallRisk: result.overallRisk,
      totalCostUsd: result.totalCostUsd,
      plan,
      result,
    }
    const next = [entry, ...entries.value.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES)
    entries.value = next
    write(next)
  }

  function clear(): void {
    entries.value = []
    write([])
  }

  return { entries, add, clear }
}
