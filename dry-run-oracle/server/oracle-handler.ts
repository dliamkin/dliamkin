/**
 * The lambda-liftable oracle handler.
 *
 * No Express types in here — the single exported `handleSimulate(rawBody)`
 * takes a parsed JSON body and returns `{ status, body }`. Lifting to AWS
 * Lambda means calling it from an API Gateway handler instead of the Express
 * route in index.ts; nothing in this file changes.
 */
import { createHash } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import type {
  AgentPlan,
  PlanStep,
  RiskLevel,
  SimulateErrorBody,
  SimulateRequestBody,
  SimulationResult,
  StepAssessment,
  TargetModel,
} from '../src/types/oracle'
import { isRiskLevel, isTargetModel } from '../src/types/oracle'
import { oracleCostUsd, planCostRange, planWorstCaseCost } from '../src/config/pricing'

export interface HandlerResult {
  status: number
  body: SimulationResult | SimulateErrorBody
}

const ORACLE_MODEL = 'claude-haiku-4-5'
const ORACLE_MAX_TOKENS = 1500 // hard cap — frugality is the product

// Keep verbatim — deliberately token-lean.
const ORACLE_SYSTEM_PROMPT =
  'You are the Dry-Run Oracle: a pre-flight simulator for AI agent plans. You receive a JSON plan of steps an agent will execute on an expensive model. Mentally simulate execution. For each step, assess: likely failure modes (missing files, ambiguous instructions, unbounded scopes, external dependencies), probability of retry loops, and realistic token consumption ranges given the step\'s scope. Be pessimistic-realistic: agents re-read context every turn, retries multiply cost, vague steps balloon. Respond with ONLY valid JSON matching the provided schema — no prose, no markdown fences.'

// Structured-output schema for the oracle response. Token ranges are
// {low, high} objects on the wire (strict schemas don't support tuple
// constraints); the handler converts them to [low, high] pairs.
// The model returns tokens and iterations ONLY — all money math happens here.
const ORACLE_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overallRisk', 'forecastHeadline', 'abortRecommended', 'steps'],
  properties: {
    overallRisk: { type: 'string', enum: ['clear', 'caution', 'storm'] },
    forecastHeadline: {
      type: 'string',
      description: 'One sentence, weather-forecast voice.',
    },
    abortRecommended: { type: 'boolean' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'stepId',
          'description',
          'riskLevel',
          'failureModes',
          'loopRisk',
          'inputTokens',
          'outputTokens',
          'iterations',
          'suggestedFix',
        ],
        properties: {
          stepId: { type: 'string' },
          description: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Short step description. Required when steps were inferred from freeform text; null otherwise.',
          },
          riskLevel: { type: 'string', enum: ['clear', 'caution', 'storm'] },
          failureModes: { type: 'array', items: { type: 'string' } },
          loopRisk: { type: 'number', description: '0-1 probability of retry/looping behavior' },
          inputTokens: {
            type: 'object',
            additionalProperties: false,
            required: ['low', 'high'],
            properties: { low: { type: 'integer' }, high: { type: 'integer' } },
            description: 'Per-iteration input token range',
          },
          outputTokens: {
            type: 'object',
            additionalProperties: false,
            required: ['low', 'high'],
            properties: { low: { type: 'integer' }, high: { type: 'integer' } },
            description: 'Per-iteration output token range',
          },
          iterations: { type: 'integer', description: 'Realistic iteration count, >= 1' },
          suggestedFix: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'Concrete plan edit that lowers risk, or null',
          },
        },
      },
    },
  },
} as const

// ---------------------------------------------------------------------------
// Wire-shape parsing (the JSON.parse boundary — narrowed immediately)
// ---------------------------------------------------------------------------

interface RawStep {
  stepId: string
  description: string | null
  riskLevel: RiskLevel
  failureModes: string[]
  loopRisk: number
  inputTokens: { low: number; high: number }
  outputTokens: { low: number; high: number }
  iterations: number
  suggestedFix: string | null
}

interface RawOracleResponse {
  overallRisk: RiskLevel
  forecastHeadline: string
  abortRecommended: boolean
  steps: RawStep[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isRange(v: unknown): v is { low: number; high: number } {
  return (
    isRecord(v) &&
    typeof v.low === 'number' &&
    typeof v.high === 'number' &&
    Number.isFinite(v.low) &&
    Number.isFinite(v.high)
  )
}

function isRawStep(v: unknown): v is RawStep {
  if (!isRecord(v)) return false
  return (
    typeof v.stepId === 'string' &&
    (v.description === null || typeof v.description === 'string') &&
    isRiskLevel(v.riskLevel) &&
    Array.isArray(v.failureModes) &&
    v.failureModes.every((m) => typeof m === 'string') &&
    typeof v.loopRisk === 'number' &&
    isRange(v.inputTokens) &&
    isRange(v.outputTokens) &&
    typeof v.iterations === 'number' &&
    (v.suggestedFix === null || typeof v.suggestedFix === 'string')
  )
}

function isRawOracleResponse(v: unknown): v is RawOracleResponse {
  if (!isRecord(v)) return false
  return (
    isRiskLevel(v.overallRisk) &&
    typeof v.forecastHeadline === 'string' &&
    typeof v.abortRecommended === 'boolean' &&
    Array.isArray(v.steps) &&
    v.steps.length > 0 &&
    v.steps.every(isRawStep)
  )
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

function validateRequest(raw: unknown): SimulateRequestBody | string {
  if (!isRecord(raw)) return 'Request body must be a JSON object.'
  const { title, targetModel, contextNotes, steps, freeform } = raw
  if (typeof title !== 'string' || title.trim().length === 0) return 'A plan title is required.'
  if (!isTargetModel(targetModel)) return 'targetModel must be claude-opus, claude-sonnet, or claude-haiku.'
  if (contextNotes !== undefined && typeof contextNotes !== 'string') return 'contextNotes must be a string.'

  const hasSteps = Array.isArray(steps) && steps.length > 0
  const hasFreeform = typeof freeform === 'string' && freeform.trim().length > 0
  if (hasSteps === hasFreeform) return 'Provide either structured steps or freeform text (not both, not neither).'

  if (hasSteps) {
    for (const s of steps) {
      if (!isRecord(s) || typeof s.id !== 'string' || typeof s.description !== 'string' || s.description.trim() === '') {
        return 'Every step needs an id and a non-empty description.'
      }
    }
    if (steps.length > 25) return 'Plans are capped at 25 steps.'
  }
  if (hasFreeform && freeform.length > 12_000) return 'Freeform plans are capped at 12,000 characters.'

  const body: SimulateRequestBody = { title: title.trim(), targetModel }
  if (typeof contextNotes === 'string' && contextNotes.trim()) body.contextNotes = contextNotes.trim()
  if (hasSteps) {
    body.steps = (steps as Record<string, unknown>[]).map((s): PlanStep => {
      const step: PlanStep = { id: String(s.id), description: String(s.description).trim() }
      if (Array.isArray(s.tools) && s.tools.length > 0) step.tools = s.tools.map(String)
      if (typeof s.expectedIterations === 'number' && s.expectedIterations >= 1) {
        step.expectedIterations = Math.round(s.expectedIterations)
      }
      return step
    })
  }
  if (hasFreeform) body.freeform = freeform.trim()
  return body
}

// ---------------------------------------------------------------------------
// Compact serialization + hashing
// ---------------------------------------------------------------------------

/** Strip empty/undefined fields; no pretty-printing. Every token counts. */
function compactPlan(plan: AgentPlan): string {
  const steps = plan.steps.map((s) => {
    const out: Record<string, unknown> = { id: s.id, description: s.description }
    if (s.tools && s.tools.length > 0) out.tools = s.tools
    if (s.expectedIterations !== undefined) out.expectedIterations = s.expectedIterations
    return out
  })
  const out: Record<string, unknown> = { title: plan.title, targetModel: plan.targetModel, steps }
  if (plan.contextNotes) out.contextNotes = plan.contextNotes
  return JSON.stringify(out)
}

export function planHashOf(serializedPlan: string, targetModel: TargetModel): string {
  return createHash('sha256').update(`${serializedPlan}|${targetModel}`).digest('hex')
}

// ---------------------------------------------------------------------------
// The handler
// ---------------------------------------------------------------------------

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  client ??= new Anthropic()
  return client
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

async function callOracle(userMessage: string): Promise<{ raw: RawOracleResponse; cost: number }> {
  const anthropic = getClient()
  const baseMessages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  let totalCost = 0
  let messages = baseMessages
  // One API call per simulation — plus at most ONE retry if the JSON is
  // malformed (near-impossible with structured outputs, but the contract
  // promises graceful degradation, not stack traces).
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({
      model: ORACLE_MODEL,
      max_tokens: ORACLE_MAX_TOKENS,
      system: ORACLE_SYSTEM_PROMPT,
      messages,
      output_config: { format: { type: 'json_schema', schema: ORACLE_RESPONSE_SCHEMA } },
    })
    totalCost += oracleCostUsd(response.usage)

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    let parsed: unknown
    try {
      parsed = JSON.parse(text) // the one allowed `unknown` boundary
    } catch {
      parsed = undefined
    }
    if (parsed !== undefined && isRawOracleResponse(parsed)) {
      return { raw: parsed, cost: totalCost }
    }
    // Retry once with the invalid output and a correction appended.
    messages = [
      ...baseMessages,
      { role: 'assistant', content: text || '(empty)' },
      { role: 'user', content: 'Your last response was invalid JSON for the schema. Respond again with ONLY valid JSON.' },
    ]
  }
  throw new Error('oracle-invalid-json')
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export async function handleSimulate(rawBody: unknown): Promise<HandlerResult> {
  const validated = validateRequest(rawBody)
  if (typeof validated === 'string') {
    return { status: 400, body: { error: validated } }
  }
  if (!hasApiKey()) {
    return {
      status: 503,
      body: { error: 'No ANTHROPIC_API_KEY configured on the server — flip on Demo mode instead.' },
    }
  }

  const { title, targetModel, contextNotes, steps, freeform } = validated
  const isFreeform = freeform !== undefined

  let userMessage: string
  let serializedForHash: string
  if (isFreeform) {
    const notes = contextNotes ? `\nContext notes: ${contextNotes}` : ''
    userMessage =
      `If plan arrives as freeform text, first infer discrete steps (assign stepId "s1".."sN" and fill each step's description).\n` +
      `Plan title: ${title}\nTarget model: ${targetModel}${notes}\nFreeform plan:\n${freeform}`
    serializedForHash = JSON.stringify({ title, targetModel, freeform, contextNotes })
  } else {
    const plan: AgentPlan = { title, targetModel, steps: steps ?? [] }
    if (contextNotes) plan.contextNotes = contextNotes
    serializedForHash = compactPlan(plan)
    userMessage = serializedForHash
  }

  let raw: RawOracleResponse
  let oracleCost: number
  try {
    const out = await callOracle(userMessage)
    raw = out.raw
    oracleCost = out.cost
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status === 429 || err.status === 529 ? 503 : 502
      return { status, body: { error: `The oracle is unreachable right now (upstream ${err.status ?? 'error'}). Try again shortly.` } }
    }
    if (err instanceof Error && err.message === 'oracle-invalid-json') {
      return { status: 502, body: { error: 'The oracle returned malformed tea leaves twice in a row. Try again.' } }
    }
    throw err
  }

  const assessments: StepAssessment[] = raw.steps.map((s) => {
    const a: StepAssessment = {
      stepId: s.stepId,
      riskLevel: s.riskLevel,
      failureModes: s.failureModes,
      loopRisk: clamp01(s.loopRisk),
      predictedInputTokens: [Math.max(0, s.inputTokens.low), Math.max(0, s.inputTokens.high)],
      predictedOutputTokens: [Math.max(0, s.outputTokens.low), Math.max(0, s.outputTokens.high)],
      predictedIterations: Math.max(1, Math.round(s.iterations)),
    }
    if (s.suggestedFix) a.suggestedFix = s.suggestedFix
    return a
  })

  // All money math is server-side, from the shared pricing table.
  const totalCostUsd = planCostRange(assessments, targetModel)
  const worstCaseCostUsd = planWorstCaseCost(assessments, targetModel)

  const result: SimulationResult = {
    planHash: planHashOf(serializedForHash, targetModel),
    overallRisk: raw.overallRisk,
    forecastHeadline: raw.forecastHeadline,
    steps: assessments,
    totalCostUsd,
    worstCaseCostUsd,
    oracleCostUsd: oracleCost,
    savingsMultiple: oracleCost > 0 ? worstCaseCostUsd / oracleCost : 0,
    abortRecommended: raw.abortRecommended,
    createdAt: new Date().toISOString(),
  }

  if (isFreeform) {
    const inferred: AgentPlan = {
      title,
      targetModel,
      steps: raw.steps.map((s, i) => ({
        id: s.stepId,
        description: s.description ?? `Step ${i + 1}`,
      })),
    }
    if (contextNotes) inferred.contextNotes = contextNotes
    result.inferredPlan = inferred
  }

  return { status: 200, body: result }
}
