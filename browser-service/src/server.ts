import express, { Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeForm, executeApply, submitApply, FieldMapping } from './engine'
import { startTailorCvJob, getTailorCvJob, TailorCvInput } from './tailorCv'

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

  const { jobUrl, cvText, coverLetter, credentials, storageState } = req.body as {
    jobUrl: string
    cvText: string
    coverLetter?: string
    credentials?: { username: string; password: string }
    storageState?: object
  }

  if (!jobUrl || !cvText) {
    res.status(400).json({ error: 'jobUrl and cvText are required' })
    return
  }

  try {
    const result = await analyzeForm(jobUrl, cvText, coverLetter, anthropic, credentials, storageState)
    res.json(result)
  } catch (err) {
    console.error('[analyze]', err)
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/execute', async (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const { jobUrl, mapping, cvText, coverLetter, storageState } = req.body as {
    jobUrl: string
    mapping: FieldMapping[]
    cvText: string
    coverLetter: string
    storageState?: object
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    for await (const event of executeApply(jobUrl, mapping, cvText ?? '', coverLetter ?? '', storageState)) {
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

// Async job pattern: Vercel's own function has a hard 60s cap (Hobby plan) that
// tailor-cv's Claude call can occasionally exceed. This service has no such cap, so the
// Vercel route only starts the job here and polls /tailor-cv/status — each of its own
// requests stays well under 60s regardless of how long generation actually takes.
app.post('/tailor-cv/start', (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const { jobId, input } = req.body as { jobId: string; input: TailorCvInput }
  if (!jobId || typeof jobId !== 'string' || !input?.cvText) {
    res.status(400).json({ error: 'jobId and input.cvText are required' })
    return
  }

  startTailorCvJob(jobId, input, anthropic)
  res.status(202).json({ jobId })
})

app.get('/tailor-cv/status/:jobId', (req: Request, res: Response) => {
  if (!authorized(req, res)) return

  const job = getTailorCvJob(req.params.jobId)
  if (!job) {
    res.status(404).json({ error: 'Unknown or expired job' })
    return
  }
  res.json(job)
})

const PORT = parseInt(process.env.PORT || '3001', 10)
app.listen(PORT, () => {
  console.log(`[browser-service] Running on port ${PORT}`)
})
