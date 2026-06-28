const http  = require('http')
const { WebSocketServer, WebSocket } = require('ws')

const PORT   = process.env.PORT || 3002
const SECRET = process.env.RAILWAY_SECRET
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1) }

const KIRA_SYSTEM = `You are Kira, an AI career assistant built into Job-Lens. Warm, direct, genuinely helpful — like a smart friend who knows the job market inside out.

PERSONALITY: Conversational. Use contractions. React naturally — "Oh nice!", "Got it —", "Found some good ones." Never sound like a report.

WHAT YOU DO:
- Career advice, salary guidance, job search help, CV feedback, interview prep
- Salary ranges DACH: entry €45-65k, mid €65-90k, senior €90-130k+. India: entry 4-8 LPA, mid 8-20 LPA, senior 20-50 LPA.
- Know Job-Lens features: Career Scan (2cr), CV Builder (1cr), Cover Letter (1cr), Auto Apply (3cr), Job Case (6cr)

VOICE RULES:
- 1-2 sentences only. Never longer.
- Plain spoken English. No lists, no markdown, no bullet points.
- Be warm and direct. Sound like a person, not an assistant.`

// Per-mode focus — mirrors the text chat mode cards, adapted for spoken voice
const MODE_FOCUS = {
  job_search:      `\n\nFOCUS: Job search. Ask what role and location they want, give salary ranges, suggest tailoring their CV next. Stay on job search.`,
  market_insights: `\n\nFOCUS: Job market analysis. Give specific salary ranges, hiring trends, in-demand skills. Be data-driven and specific, never vague.`,
  cv_review:       `\n\nFOCUS: CV coaching. One question at a time, natural back-and-forth. After a few exchanges give a quick verdict — score out of ten, strengths, gaps.`,
  interview_prep:  `\n\nFOCUS: Interview prep. Ask what role and company first, then give STAR-style answers and likely questions specific to that role.`,
  feature_help:    `\n\nFOCUS: Explaining Job-Lens tools — Career Scan, CV Builder, Cover Letter, Auto Apply, Job Case. Point them to the right tool for their need.`,
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return }
  res.writeHead(404); res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', (clientWs, req) => {
  // Verify shared secret
  const url    = new URL(req.url, `http://localhost`)
  const secret = url.searchParams.get('secret')
  if (SECRET && secret !== SECRET) {
    clientWs.close(1008, 'Unauthorized')
    return
  }

  const market = url.searchParams.get('market') || 'eu'
  const mode   = url.searchParams.get('mode') || ''

  const marketCtx = market === 'in'
    ? '\n\nMARKET: India. Use INR/LPA for salaries. Cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi NCR.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Use EUR/CHF. Respond in German if user speaks German.'

  const modeCtx = MODE_FOCUS[mode] || ''

  console.log(`[realtime] client connected — market: ${market}, mode: ${mode || 'none'}`)

  // Open connection to OpenAI Realtime API
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini-2025-12-15',
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
    }
  )

  openaiWs.on('open', () => {
    console.log('[realtime] OpenAI connected')

    // Configure the session — fields must match the OpenAI Realtime API spec exactly
    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        type:                      'session',
        modalities:                ['audio', 'text'],
        instructions:              KIRA_SYSTEM + marketCtx + modeCtx,
        voice:                     'shimmer',
        input_audio_format:        'pcm16',
        output_audio_format:       'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type:                'server_vad',
          threshold:           0.6,
          prefix_padding_ms:   300,
          silence_duration_ms: 800,
        },
      },
    }))
  })

  // Forward messages: OpenAI → client (preserve text/binary frame type)
  openaiWs.on('message', (data, isBinary) => {
    try {
      const evt = JSON.parse(data)
      if (evt.error) {
        console.error('[realtime] OpenAI error:', JSON.stringify(evt.error))
      }
    } catch { /* non-JSON */ }
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(isBinary ? data : data.toString(), { binary: isBinary })
    }
  })

  // Forward messages: client → OpenAI (always text frames)
  clientWs.on('message', (data, isBinary) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(isBinary ? data : data.toString(), { binary: isBinary })
    }
  })

  clientWs.on('close', () => {
    console.log('[realtime] client disconnected')
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close()
  })

  openaiWs.on('close', (code, reason) => {
    console.log('[realtime] OpenAI closed:', code, reason?.toString())
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close()
  })

  openaiWs.on('error', (err) => {
    console.error('[realtime] OpenAI WS error:', err.message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: `OpenAI connection failed: ${err.message}` }))
      clientWs.close()
    }
  })

  openaiWs.on('unexpected-response', (req, res) => {
    let body = ''
    res.on('data', (d) => { body += d })
    res.on('end', () => {
      console.error('[realtime] OpenAI unexpected response:', res.statusCode, body)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: `OpenAI rejected (${res.statusCode}): ${body.slice(0, 200)}` }))
        clientWs.close()
      }
    })
  })

  clientWs.on('error', (err) => {
    console.error('[realtime] client WS error:', err.message)
    if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close()
  })
})

server.listen(PORT, () => {
  console.log(`[realtime] listening on port ${PORT}`)
})
