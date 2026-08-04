/**
 * Express bootstrap for the oracle proxy. All Express-specific logic lives
 * here; the actual work happens in oracle-handler.ts (lambda-liftable).
 */
import dotenv from 'dotenv'
import express from 'express'

// Key lives next to this file (server/.env, gitignored); fall back to a
// project-root .env for people who prefer that.
dotenv.config({ path: new URL('./.env', import.meta.url).pathname })
dotenv.config()

import { handleSimulate, hasApiKey } from './oracle-handler'
import { checkRateLimit, pruneRateLimiter } from './rate-limit'

const PORT = 3001
const app = express()

app.use(express.json({ limit: '256kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: hasApiKey() })
})

app.post('/api/simulate', async (req, res) => {
  const ip = req.ip ?? 'unknown'
  const decision = checkRateLimit(ip)
  if (!decision.allowed) {
    res
      .status(429)
      .set('Retry-After', String(decision.retryAfterSeconds))
      .json({
        error:
          'The oracle needs a breather — 10 forecasts per hour per visitor. Come back in a bit (or use Demo mode, it\'s free).',
        retryAfterSeconds: decision.retryAfterSeconds,
      })
    return
  }

  try {
    const { status, body } = await handleSimulate(req.body)
    res.status(status).json(body)
  } catch (err) {
    console.error('[oracle] unexpected error:', err)
    res.status(500).json({ error: 'The oracle dropped its crystal ball. Try again.' })
  }
})

setInterval(pruneRateLimiter, 10 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`[oracle] proxy listening on http://localhost:${PORT}`)
  if (!hasApiKey()) {
    console.log('[oracle] no ANTHROPIC_API_KEY found — the client will default to demo mode')
  }
})
