/**
 * Shared type contracts for the Dry-Run Oracle.
 * Imported by both the Vue client (src/) and the Express proxy (server/).
 */

export type TargetModel = 'claude-opus' | 'claude-sonnet' | 'claude-haiku'

export interface PlanStep {
  id: string // client-generated
  description: string // what the agent will do in this step
  tools?: string[] // tools the step uses, e.g. ["web_search", "file_write"]
  expectedIterations?: number // user's guess; oracle may override
}

export interface AgentPlan {
  title: string
  targetModel: TargetModel
  steps: PlanStep[]
  contextNotes?: string // freeform: codebase size, data volume, constraints
}

export type RiskLevel = 'clear' | 'caution' | 'storm' // weather-themed

export interface StepAssessment {
  stepId: string
  riskLevel: RiskLevel
  failureModes: string[] // e.g. "file may not exist; parse will throw"
  loopRisk: number // 0–1 probability of retry/looping behavior
  predictedInputTokens: [number, number] // [low, high] range
  predictedOutputTokens: [number, number]
  predictedIterations: number
  suggestedFix?: string // concrete plan edit that lowers risk
}

export interface SimulationResult {
  planHash: string
  overallRisk: RiskLevel
  forecastHeadline: string // one sentence, weather-forecast voice
  steps: StepAssessment[]
  totalCostUsd: [number, number] // [low, high]
  worstCaseCostUsd: number // if all loop risks materialize
  oracleCostUsd: number // what THIS simulation cost (recursion flex)
  savingsMultiple: number // worstCaseCostUsd / oracleCostUsd
  abortRecommended: boolean
  createdAt: string
  /**
   * Present when the plan was submitted as freeform text: the oracle infers
   * discrete steps and the handler echoes the structured plan back so the UI
   * can render step cards and support "Edit & Re-run".
   */
  inferredPlan?: AgentPlan
}

/** Request body accepted by POST /api/simulate. Exactly one of steps | freeform. */
export interface SimulateRequestBody {
  title: string
  targetModel: TargetModel
  contextNotes?: string
  steps?: PlanStep[]
  freeform?: string
}

/** Error envelope the proxy returns on non-2xx. */
export interface SimulateErrorBody {
  error: string
  retryAfterSeconds?: number
}

// ---------------------------------------------------------------------------
// Type guards (the only place `unknown`/`any` narrowing is allowed)
// ---------------------------------------------------------------------------

const RISK_LEVELS: readonly RiskLevel[] = ['clear', 'caution', 'storm']
const TARGET_MODELS: readonly TargetModel[] = ['claude-opus', 'claude-sonnet', 'claude-haiku']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === 'string' && (RISK_LEVELS as readonly string[]).includes(v)
}

export function isTargetModel(v: unknown): v is TargetModel {
  return typeof v === 'string' && (TARGET_MODELS as readonly string[]).includes(v)
}

function isTokenPair(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  )
}

export function isStepAssessment(v: unknown): v is StepAssessment {
  if (!isRecord(v)) return false
  return (
    typeof v.stepId === 'string' &&
    isRiskLevel(v.riskLevel) &&
    Array.isArray(v.failureModes) &&
    v.failureModes.every((m) => typeof m === 'string') &&
    typeof v.loopRisk === 'number' &&
    v.loopRisk >= 0 &&
    v.loopRisk <= 1 &&
    isTokenPair(v.predictedInputTokens) &&
    isTokenPair(v.predictedOutputTokens) &&
    typeof v.predictedIterations === 'number' &&
    v.predictedIterations >= 1 &&
    (v.suggestedFix === undefined || typeof v.suggestedFix === 'string')
  )
}

export function isSimulationResult(v: unknown): v is SimulationResult {
  if (!isRecord(v)) return false
  return (
    typeof v.planHash === 'string' &&
    isRiskLevel(v.overallRisk) &&
    typeof v.forecastHeadline === 'string' &&
    Array.isArray(v.steps) &&
    v.steps.every(isStepAssessment) &&
    isTokenPair(v.totalCostUsd) &&
    typeof v.worstCaseCostUsd === 'number' &&
    typeof v.oracleCostUsd === 'number' &&
    typeof v.savingsMultiple === 'number' &&
    typeof v.abortRecommended === 'boolean' &&
    typeof v.createdAt === 'string'
  )
}
