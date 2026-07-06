import express, { Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeForm, executeApply, submitApply, FieldMapping } from './engine'

const app = express()
app.use(express.json({ limit: '10mb' }))

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SECRET = process.env.BROWSER_SECRET

function authorized(req: Request, res: Response): boolean {
  if (!SECRET) {
    res.status(500).json({ error: 'BROWSER_SECRET not configured on this service' })
    return false
  }
  if (req.headers.authorization !== `Bearer ${SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'job-lens-browser-service' })
})

app.post('/analyze', async (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const { jobUrl, cvText, coverLetter, credentials } = req.body as {
    jobUrl: string
    cvText: string
    coverLetter?: string
    credentials?: { username: string; password: string }
  }

  if (!jobUrl || !cvText) {
    res.status(400).json({ error: 'jobUrl and cvText are required' })
    return
  }

  try {
    const result = await analyzeForm(jobUrl, cvText, coverLetter, anthropic, credentials)
    res.json(result)
  } catch (err) {
    console.error('[analyze]', err)
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/execute', async (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const { jobUrl, mapping, cvText, coverLetter } = req.body as {
    jobUrl: string
    mapping: FieldMapping[]
    cvText: string
    coverLetter: string
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    for await (const event of executeApply(jobUrl, mapping, cvText ?? '', coverLetter ?? '')) {
      send(event)
    }
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  } finally {
    res.end()
  }
})

// Submit accepts only sessionId — the browser + filled page are already stored in the session store
app.post('/submit', async (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const { sessionId } = req.body as { sessionId: string }

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId is required' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    for await (const event of submitApply(sessionId)) {
      send(event)
    }
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  } finally {
    res.end()
  }
})

const PORT = parseInt(process.env.PORT || '3001', 10)
app.listen(PORT, () => {
  console.log(`[browser-service] Running on port ${PORT}`)
})
