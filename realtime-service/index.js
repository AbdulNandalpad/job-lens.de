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

// Log available realtime models on startup
fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } })
  .then(r => r.json())
  .then(d => {
    const rt = d.data?.filter(m => m.id.includes('realtime')).map(m => m.id)
    console.log('[realtime] available realtime models:', rt)
  })
  .catch(e => console.error('[realtime] models fetch failed:', e.message))

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

  const marketCtx = market === 'in'
    ? '\n\nMARKET: India. Use INR/LPA for salaries. Cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi NCR.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Use EUR/CHF. Respond in German if user speaks German.'

  console.log(`[realtime] client connected — market: ${market}`)

  // Open connection to OpenAI Realtime API
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28',
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
    }
  )

  openaiWs.on('open', () => {
    console.log('[realtime] OpenAI connected')

    // Configure the session
    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        type:              'realtime',
        instructions:      KIRA_SYSTEM + marketCtx,
        output_modalities: ['audio', 'text'],
        audio: {
          input: {
            format: { type: 'audio/pcm' },
            turn_detection: {
              type:               'server_vad',
              silence_duration_ms: 700,
              threshold:           0.5,
            },
          },
          output: {
            format: { type: 'audio/pcm' },
            voice:  'coral',
            speed:  1.1,
          },
        },
      },
    }))
  })

  // Forward messages: OpenAI → client
  openaiWs.on('message', (data) => {
    try {
      const evt = JSON.parse(data)
      if (evt.type !== 'response.audio.delta' && evt.type !== 'input_audio_buffer.append') {
        console.log('[realtime] OpenAI event:', evt.type, evt.error ? JSON.stringify(evt.error) : '')
      }
    } catch { /* non-JSON */ }
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)
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
