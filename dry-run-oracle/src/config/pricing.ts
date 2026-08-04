import type { StepAssessment, TargetModel } from '../types/oracle'

// VERIFY against https://claude.com/pricing before deploying — prices change.
// Values below are the Anthropic first-party API rates as of 2026-08
// (per million tokens). Single source of truth: imported by both the Vue
// client (per-step chart math) and the Express proxy (all response totals).
export const PRICING: Record<TargetModel, { inputPerMTok: number; outputPerMTok: number }> = {
  'claude-opus': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-sonnet': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku': { inputPerMTok: 1, outputPerMTok: 5 },
}

// The oracle itself runs on claude-haiku-4-5 — the whole point is that the
// forecast costs pocket change compared to the run it de-risks.
export const ORACLE_PRICING = { inputPerMTok: 1, outputPerMTok: 5 }

export const TARGET_MODEL_LABELS: Record<TargetModel, string> = {
  'claude-opus': 'Claude Opus',
  'claude-sonnet': 'Claude Sonnet',
  'claude-haiku': 'Claude Haiku',
}

const MTOK = 1_000_000

/**
 * Agents re-send prior context every iteration, so input grows roughly
 * linearly per turn: iteration n costs ≈ base × n input tokens.
 * Total input over k iterations ≈ base × (1 + 2 + … + k) = base × k(k+1)/2.
 */
export function iterationInputMultiplier(iterations: number): number {
  const k = Math.max(1, Math.round(iterations))
  return (k * (k + 1)) / 2
}

/**
 * If a step's loop risk materializes, retries multiply the iteration count.
 * We model worst case as the predicted count inflated by up to 2× at
 * loopRisk = 1 (a 0.5-risk step doubles, a 1.0-risk step triples).
 */
export function worstCaseIterations(iterations: number, loopRisk: number): number {
  const k = Math.max(1, Math.round(iterations))
  return Math.max(k, Math.ceil(k * (1 + 2 * loopRisk)))
}

function costFor(
  inputTokensPerIteration: number,
  outputTokensPerIteration: number,
  iterations: number,
  model: TargetModel,
): number {
  const { inputPerMTok, outputPerMTok } = PRICING[model]
  const totalInput = inputTokensPerIteration * iterationInputMultiplier(iterations)
  const totalOutput = outputTokensPerIteration * Math.max(1, Math.round(iterations))
  return (totalInput / MTOK) * inputPerMTok + (totalOutput / MTOK) * outputPerMTok
}

/** Expected [low, high] cost for one step at its predicted iteration count. */
export function stepCostRange(step: StepAssessment, model: TargetModel): [number, number] {
  return [
    costFor(step.predictedInputTokens[0], step.predictedOutputTokens[0], step.predictedIterations, model),
    costFor(step.predictedInputTokens[1], step.predictedOutputTokens[1], step.predictedIterations, model),
  ]
}

/** Worst-case cost for one step: high token bounds × loop-inflated iterations. */
export function stepWorstCaseCost(step: StepAssessment, model: TargetModel): number {
  return costFor(
    step.predictedInputTokens[1],
    step.predictedOutputTokens[1],
    worstCaseIterations(step.predictedIterations, step.loopRisk),
    model,
  )
}

/** Sum expected [low, high] over all steps. */
export function planCostRange(steps: StepAssessment[], model: TargetModel): [number, number] {
  return steps.reduce<[number, number]>(
    (acc, s) => {
      const [lo, hi] = stepCostRange(s, model)
      return [acc[0] + lo, acc[1] + hi]
    },
    [0, 0],
  )
}

/** Sum worst case over all steps — "if all loop risks materialize". */
export function planWorstCaseCost(steps: StepAssessment[], model: TargetModel): number {
  return steps.reduce((acc, s) => acc + stepWorstCaseCost(s, model), 0)
}

/** What the oracle call itself cost, from the real usage block. */
export function oracleCostUsd(usage: { input_tokens: number; output_tokens: number }): number {
  return (
    (usage.input_tokens / MTOK) * ORACLE_PRICING.inputPerMTok +
    (usage.output_tokens / MTOK) * ORACLE_PRICING.outputPerMTok
  )
}

/** Compact money formatting shared by the UI. */
export function formatUsd(v: number): string {
  if (v === 0) return '$0'
  if (v < 0.01) return `$${v.toFixed(4)}`
  if (v < 1) return `$${v.toFixed(3)}`
  if (v < 100) return `$${v.toFixed(2)}`
  return `$${Math.round(v).toLocaleString('en-US')}`
}

export function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return `${v}`
}
