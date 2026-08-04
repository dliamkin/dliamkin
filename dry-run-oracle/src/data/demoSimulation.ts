import type { AgentPlan, SimulationResult, StepAssessment } from '../types/oracle'
import { oracleCostUsd, planCostRange, planWorstCaseCost } from '../config/pricing'

/**
 * Canned result for demo mode. This is what portfolio visitors without an
 * API key see, so it exercises the full UI range: one storm-level step with
 * high loop risk, a caution step, suggested fixes, and an abort banner kept
 * off (storm ≠ abort — the fix is applying the suggested edit).
 *
 * All money fields are derived from the same pricing functions the live
 * server uses, so the demo numbers are internally consistent.
 */

export const DEMO_PLAN: AgentPlan = {
  title: 'Refactor auth module across 40 files',
  targetModel: 'claude-opus',
  contextNotes:
    'Mid-size TypeScript monorepo (~180K LOC). Legacy auth module imported in 40 files. CI suite takes 6 minutes.',
  steps: [
    {
      id: 'demo-s1',
      description: 'Map all usages of the legacy auth module across the codebase',
      tools: ['grep', 'file_read'],
      expectedIterations: 2,
    },
    {
      id: 'demo-s2',
      description: 'Design the new auth interface and write a migration plan to a scratch file',
      tools: ['file_read', 'file_write'],
      expectedIterations: 1,
    },
    {
      id: 'demo-s3',
      description: 'Refactor all 40 files to the new interface',
      tools: ['file_read', 'file_write'],
      expectedIterations: 8,
    },
    {
      id: 'demo-s4',
      description: 'Fix all failing tests until the suite is green',
      tools: ['bash', 'file_write'],
      expectedIterations: 3,
    },
    {
      id: 'demo-s5',
      description: 'Write a migration summary and changelog entry',
      tools: ['file_write'],
      expectedIterations: 1,
    },
  ],
}

const DEMO_STEPS: StepAssessment[] = [
  {
    stepId: 'demo-s1',
    riskLevel: 'clear',
    failureModes: ['Grep patterns may miss dynamic imports and re-exports'],
    loopRisk: 0.05,
    predictedInputTokens: [8_000, 14_000],
    predictedOutputTokens: [1_200, 2_500],
    predictedIterations: 2,
  },
  {
    stepId: 'demo-s2',
    riskLevel: 'clear',
    failureModes: ['Interface may under-specify session-refresh edge cases'],
    loopRisk: 0.1,
    predictedInputTokens: [10_000, 16_000],
    predictedOutputTokens: [2_000, 4_000],
    predictedIterations: 1,
  },
  {
    stepId: 'demo-s3',
    riskLevel: 'caution',
    failureModes: [
      '40 files won\'t fit one context window — agent will re-read the plan file every batch',
      'Mechanical edits drift as context fills; later files get sloppier than earlier ones',
    ],
    loopRisk: 0.35,
    predictedInputTokens: [22_000, 38_000],
    predictedOutputTokens: [6_000, 11_000],
    predictedIterations: 8,
    suggestedFix:
      'Split into batches of 5 files with a checklist file the agent updates after each batch, so progress survives context compaction.',
  },
  {
    stepId: 'demo-s4',
    riskLevel: 'storm',
    failureModes: [
      '"Until green" is unbounded — flaky tests make this a classic retry storm',
      'Each fix attempt re-runs the 6-minute suite and re-reads failing output into context',
      'Agent may start "fixing" tests by weakening assertions instead of fixing the refactor',
    ],
    loopRisk: 0.85,
    predictedInputTokens: [30_000, 55_000],
    predictedOutputTokens: [4_000, 9_000],
    predictedIterations: 6,
    suggestedFix:
      'Cap at 3 fix attempts, run only the test files touched by the refactor, and require failures to be listed before any edit is made.',
  },
  {
    stepId: 'demo-s5',
    riskLevel: 'clear',
    failureModes: ['None significant — bounded single-shot writing task'],
    loopRisk: 0.02,
    predictedInputTokens: [6_000, 9_000],
    predictedOutputTokens: [1_500, 3_000],
    predictedIterations: 1,
  },
]

// What the (pretend) oracle call cost — realistic usage for a plan this size.
const DEMO_ORACLE_USAGE = { input_tokens: 1_460, output_tokens: 560 }

export function buildDemoSimulation(): SimulationResult {
  const model = DEMO_PLAN.targetModel
  const totalCostUsd = planCostRange(DEMO_STEPS, model)
  const worstCaseCostUsd = planWorstCaseCost(DEMO_STEPS, model)
  const oracleCost = oracleCostUsd(DEMO_ORACLE_USAGE)
  return {
    planHash: 'demo',
    overallRisk: 'storm',
    forecastHeadline:
      'Mostly clear through step 3, then an 85% chance of retry storms in step 4 — pack a test-attempt cap.',
    steps: DEMO_STEPS,
    totalCostUsd,
    worstCaseCostUsd,
    oracleCostUsd: oracleCost,
    savingsMultiple: worstCaseCostUsd / oracleCost,
    abortRecommended: false,
    createdAt: new Date().toISOString(),
  }
}

export const DEMO_DELAY_MS = 1_800
