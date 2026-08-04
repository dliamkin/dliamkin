# Dry-Run Oracle

A pre-flight check for expensive AI agent tasks. Paste your plan; a cheap model (Claude Haiku)
simulates it — predicting failure points, retry loops, and the token bill per step — before a
single expensive token burns. **A weather forecast for AI spend.**

## Setup

1. `npm install`
2. `cp server/.env.example server/.env` and add your `ANTHROPIC_API_KEY` (skip this for demo mode)
3. `npm run dev` — starts the Vite client (5173) and the Express proxy (3001) together
4. Open http://localhost:5173

No key configured? The app auto-defaults to **Demo mode** (canned forecast, zero network calls).
`VITE_DEMO_MODE=true` forces it; the header toggle switches it any time.

## How it stays frugal (the whole point)

- **One Haiku call per simulation**, hard-capped at `max_tokens: 1500`, with a compact
  (stripped, non-pretty-printed) plan serialization.
- **Cache by hash**: SHA-256 of the serialized plan + target model, in `localStorage`. A cache hit
  renders instantly with a "cached forecast — 0 tokens spent" tag.
- **The model only predicts tokens and iterations.** All money math runs server-side from
  [`src/config/pricing.ts`](src/config/pricing.ts) — the single pricing source of truth for client
  and server. Verify against https://claude.com/pricing before deploying.
- Every report displays what the forecast itself cost (`oracleCostUsd`) and the savings multiple.

## Cost model

Agents re-send prior context each iteration, so a step with per-iteration base input `b` over `k`
iterations costs ≈ `b × k(k+1)/2` input tokens (plus `output × k`). Worst case inflates iterations
by up to 2× at `loopRisk = 1` (a 0.5-risk step doubles, a 1.0-risk step triples) and uses the high
token bounds — that's the "if all loop risks materialize" number.

## Architecture

```
Browser (Vue 3 + PrimeVue Aura dark)
   └── /api/* ──(Vite dev proxy)──► Express :3001
                                       ├── rate-limit.ts   10 simulations/hour/IP → friendly 429
                                       └── oracle-handler.ts ──► Anthropic Messages API (claude-haiku-4-5)
```

The API key lives only in `server/.env` — it never reaches the browser.

## Deploy-to-Lambda notes

`server/oracle-handler.ts` is deliberately Express-free: one exported
`handleSimulate(rawBody) → { status, body }`. To lift it into AWS Lambda:

1. New entry file: parse `event.body` from the API Gateway event, call `handleSimulate`, and
   return `{ statusCode: result.status, body: JSON.stringify(result.body) }`.
2. Drop `server/index.ts` (Express bootstrap) from the bundle; it's dev-only glue.
3. Move rate limiting to API Gateway throttling (the in-memory limiter in `rate-limit.ts` doesn't
   survive Lambda cold starts — it's already isolated so deleting it is one import).
4. Set `ANTHROPIC_API_KEY` as a Lambda environment variable (or better, Secrets Manager).
5. Point the client's `/api` at the API Gateway stage URL instead of the Vite proxy.

## Decisions made along the way (per the brief's "decide and note" rule)

- **Structured outputs instead of prose-schema prompting.** The oracle call uses the Messages API's
  `output_config.format` (JSON schema enforcement), so the response schema isn't re-sent as prompt
  text on every call — fewer tokens, near-zero malformed JSON. The brief's "invalid JSON → one
  retry → graceful error" path is still implemented as a backstop, driven by a type guard.
- **Token ranges travel as `{low, high}` objects on the wire** (strict JSON schemas don't support
  tuple constraints) and are converted to the `[low, high]` pairs the shared types specify.
- **Freeform plans**: the oracle returns a per-step `description` so the handler can echo a
  structured `inferredPlan` back — that's what makes "Edit & Re-run" work after a freeform submit.
- **"Apply fix" appends the fix as a constraint** to the step description (rather than replacing
  it), pre-fills the editor, and marks the report stale.
- **Rate-limit responses are 429 + `Retry-After`** with a friendly message the UI surfaces as a
  toast; upstream Anthropic errors map to 502/503 with weather-voice messages, never stack traces.
- Demo results are computed through the same pricing functions as live ones, so the demo numbers
  are internally consistent rather than hand-waved.
