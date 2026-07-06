# Kira — AI Career Assistant

Kira is Job-Lens's conversational AI, a floating widget rendered into `document.body` via React `createPortal`. She lives in `src/components/AIWidget.tsx` (≈1700 lines) and is mounted in the DACH layout (`src/app/app/layout.tsx`) and India layout (`src/app/in/layout.tsx`).

---

## Voice architecture

Kira has one voice mode: realtime voice-to-voice via the OpenAI Realtime API, proxied through a Railway WebSocket service.

### Realtime voice (OpenAI Realtime API via Railway proxy)

```
User speaks
  → browser mic captured as PCM16 @ 24 kHz via ScriptProcessor
  → streamed over WebSocket to realtime-service (Railway)
  → Railway proxies audio frames to OpenAI Realtime API
  → OpenAI returns response.audio.delta events (PCM16 audio chunks)
  → Railway forwards them to the browser
  → browser plays chunks via AudioContext.createBufferSource()
```

**Triggered by:** the mic button in the Kira header (only shown when `NEXT_PUBLIC_REALTIME_WS_URL` is set in Vercel).  
**Requires:** Railway `realtime-service` deployed and `NEXT_PUBLIC_REALTIME_WS_URL` + `NEXT_PUBLIC_RAILWAY_SECRET` set in Vercel at build time.

---

## realtime-service

**Location:** `realtime-service/index.js`  
**Runtime:** Node.js + `ws` package  
**Deploy:** Railway (separate from the Vercel Next.js app — must be deployed independently)

### Environment variables (Railway)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI key with Realtime API access |
| `RAILWAY_SECRET` | Shared secret — must match `NEXT_PUBLIC_RAILWAY_SECRET` in Vercel |
| `PORT` | Set automatically by Railway |

### Environment variables (Vercel)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_REALTIME_WS_URL` | Railway WebSocket URL, e.g. `wss://your-service.railway.app` — must be set at **build time** |
| `NEXT_PUBLIC_RAILWAY_SECRET` | Must match `RAILWAY_SECRET` on Railway |

> `NEXT_PUBLIC_*` variables are embedded at build time in Next.js. Changing them in Vercel requires a **new deployment** (not just a restart).

---

## OpenAI Realtime API — session.update format for `gpt-realtime-mini-2025-12-15`

> **Important:** `gpt-realtime-mini-2025-12-15` uses a **different session schema** from
> `gpt-4o-realtime-preview`. The two schemas are mutually incompatible. Do not apply
> docs or examples written for `gpt-4o-realtime-preview` to this model.

```js
openaiWs.send(JSON.stringify({
  type: 'session.update',
  session: {
    type:              'realtime',           // required; 'realtime' or 'transcription'
    instructions:      '<system prompt>',
    output_modalities: ['audio'],            // NOT 'modalities' — that field is rejected
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: 24000 },
        turn_detection: {
          type:                'server_vad',
          threshold:           0.7,
          prefix_padding_ms:   300,
          silence_duration_ms: 900,
          interrupt_response:  true,
          create_response:     true,
        },
      },
      output: {
        format: { type: 'audio/pcm', rate: 24000 },
        voice:  'marin',                     // model-specific voice; not in gpt-4o-realtime
        speed:  1.1,
      },
    },
  },
}))
```

### What happens if you use the wrong schema

Using the `gpt-4o-realtime-preview` flat schema against this model produces:

| Wrong field | Error returned |
|---|---|
| `modalities` instead of `output_modalities` | `Unknown parameter: 'session.modalities'` |
| `type: 'session'` | `Invalid value: 'session'. Supported values are: 'realtime' and 'transcription'` |
| omit `type` entirely | `Missing required parameter: 'session.type'` |
| `input_audio_format: 'pcm16'` at top level | silently ignored or rejected |

### What NOT to include in session.update

These fields are **rejected** by `gpt-realtime-mini-2025-12-15` and will cause a `400 invalid_request_error`:

- `session.modalities` — use `output_modalities` at the session level instead, or omit (audio is default)
- `session.voice` — must be inside `session.audio.output.voice`, not at the top level
- `session.temperature` — not accepted
- `session.input_audio_format` / `session.output_audio_format` at top level — must go inside `session.audio.input.format` / `session.audio.output.format`
- `response.modalities` inside a `response.create` event — rejected; omit it entirely
- Tools with nested `function` wrapper: `{ type: 'function', function: { name, description, parameters } }` — wrong. Use flat format: `{ type: 'function', name, description, parameters }`

### Common errors

| Error shown in Kira chat | Cause | Fix |
|---|---|---|
| `Voice connection error: Unknown parameter: 'session.modalities'` | Wrong schema applied (gpt-4o format used on this model) | Restore the nested `audio.input`/`audio.output` format above |
| `Voice connection error: Invalid value: 'session'` | `session.type` was set to `'session'` | Must be `'realtime'` |
| `Voice connection error: Missing required parameter: 'session.type'` | `session.type` omitted | Add `type: 'realtime'` inside `session` |
| `Voice connection error: Unknown parameter: 'session.voice'` | `voice` set at top level of session | Move to `session.audio.output.voice` |
| `Voice connection error: Unknown parameter: 'session.temperature'` | `temperature` not supported | Remove it |
| `Voice connection error: Invalid type for 'session.audio.input.format'` | Format passed as string `'pcm16'` | Use object: `{ type: 'audio/pcm', rate: 24000 }` |
| `Voice connection error: Invalid value: 'pcm16'` | Format type string is wrong | Use `'audio/pcm'` not `'pcm16'` |
| `Voice connection error: Missing required parameter: 'session.tools[0].name'` | Tools sent in nested `function` wrapper | Use flat format: `{ type: 'function', name, description, parameters }` |
| `Voice connection error: Conversation already has an active response in progress` | `response.create` called while a response is pending | Guard with `responseInProgress` flag; set true on `response.created`, false on `response.done` |
| `Voice connection error: OpenAI rejected (401)` | `OPENAI_API_KEY` missing or wrong on Railway | Set the env var in Railway dashboard |
| User sees "Listening…" but hears nothing, no error | Session config accepted but output is text-only | Ensure `output_modalities: ['audio']` is present |

---

## Tool call handling (realtime-service)

`gpt-realtime-mini-2025-12-15` signals a completed tool call via **`response.output_item.done`** where `item.type === 'function_call'`. Do NOT rely on the legacy `response.function_call_arguments.done` event — it fires on this model too, causing double execution if both handlers are active.

Correct handler:

```js
if (t === 'response.output_item.done' && evt.item?.type === 'function_call') {
  const name   = evt.item.name || ''
  const callId = evt.item.call_id || evt.item.id
  let args = {}
  try { args = JSON.parse(evt.item.arguments || '{}') } catch {}

  // Pause silence timer while tool executes (Anthropic API can take 2-5s)
  if (silenceTimer) clearTimeout(silenceTimer)

  // ... execute tool ...

  openaiWs.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) },
  }))
  if (!responseInProgress) {
    openaiWs.send(JSON.stringify({ type: 'response.create' }))
  }
}
```

**Do not send `response.modalities` inside `response.create`** — that field is rejected.

---

## Silence timer behaviour

`realtime-service` runs a silence-nudge timer: if the user is quiet for N seconds, it injects a system message to prevent Kira going idle. Two bugs to avoid:

1. **Timer fires during tool execution** — the Anthropic API can take 2–5 s. The silence timer must be paused when a tool call starts and reset (not restarted) after the tool result is sent back.
2. **Timer fires while Kira is speaking** — in half-duplex mode the mic is gated during playback, so no audio reaches the server → silence timer counts down and fires mid-speech. Fix: reset the silence timer on every `response.output_audio.delta` event (i.e. while Kira is speaking).

```js
if (t === 'response.output_audio.delta') {
  silenceNudged = false
  resetSilenceTimer()   // keep resetting while Kira talks
}
```

---

## Audio scheduling (AIWidget.tsx)

PCM16 chunks arrive as `response.audio.delta` (base64). Each chunk must be decoded and scheduled on the `AudioContext` timeline with a small lookahead to avoid gaps:

```js
const now   = ctx.currentTime
const start = realtimeNextTimeRef.current <= now
  ? now + 0.20          // 200 ms buffer to absorb network jitter
  : realtimeNextTimeRef.current
src.start(start)
realtimeNextTimeRef.current = start + buf.duration
```

- **200 ms lookahead** prevents first-word cutoff (the initial chunk often arrives before the context clock catches up).
- `realtimeNextTimeRef` chains chunks seamlessly — each starts where the previous ended.
- Reset `realtimeNextTimeRef` to `0` whenever realtime mode is exited.

---

## Maintenance mode

**`KIRA_MAINTENANCE`** in `src/lib/constants.ts` is a compile-time flag. When `true`, non-admin users see a "Kira is temporarily offline" screen instead of the full widget. Admins (checked via `isAdmin` from `/api/user/profile`) bypass it and get the full widget.

To re-enable Kira: set `KIRA_MAINTENANCE = false` and redeploy to Vercel.

The maintenance gate is in `AIWidget.tsx` immediately after the panel header `</div>`.

---

## Client-side event handling (AIWidget.tsx)

The browser listens to `ws.onmessage` and dispatches on `evt.type`. Key audio events:

| Event | Action |
|---|---|
| `session.created` / `session.updated` | Set state to `ready` ("Speak anytime") |
| `input_audio_buffer.speech_started` | Set state to `listening` |
| `input_audio_buffer.speech_stopped` | Set state to `processing` |
| `response.audio.delta` | Decode PCM16 base64 chunk, schedule via `AudioContext.createBufferSource()` |
| `response.audio.done` / `response.done` | Set state back to `ready` |
| `response.audio_transcript.done` | Append Kira's spoken text to chat history |
| `error` | Show error in chat, exit realtime mode |

The `response.audio.delta` event carries the audio in `evt.delta` (base64 PCM16). The client converts: `base64 → Int16Array → Float32Array → AudioBuffer → BufferSource`.

---

## AudioContext note

The realtime `AudioContext` (24 kHz, for playback) is created **synchronously inside the mic button's click handler** before any `await`. This is required — browsers suspend AudioContexts created outside a user gesture. The context is stored in `realtimeCtxRef` and reused in `ws.onopen`.

---

## Voices available

Realtime API: `marin` (via `gpt-realtime-mini-2025-12-15`)
