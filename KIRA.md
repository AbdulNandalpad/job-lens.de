# Kira — AI Career Assistant

Kira is Job-Lens's conversational AI, a floating widget rendered into `document.body` via React `createPortal`. She lives in `src/components/AIWidget.tsx` (≈1700 lines) and is mounted in the DACH layout (`src/app/app/layout.tsx`) and India layout (`src/app/in/layout.tsx`).

---

## Voice architecture

Kira has two independent voice modes. They share no code path.

### Mode 1 — Standard voice (SpeechRecognition + AI chat + TTS)

```
User speaks
  → browser SpeechRecognition (Chrome) or Whisper via /api/ai/stt (Firefox / iOS)
  → transcript text sent to /api/ai/chat (Claude via Anthropic SDK)
  → streamed text response
  → /api/ai/tts (OpenAI TTS-1-HD, voice: nova, MP3 stream)
  → played back via MediaSource + <audio> element
```

**Triggered by:** the mic button in the Kira header (always visible on desktop).  
**No external service required.** Entirely self-contained within the Vercel app.  
**TTS env var:** `OPENAI_API_KEY` (same key as the realtime service).

### Mode 2 — Live voice / realtime (OpenAI Realtime API via Railway proxy)

```
User speaks
  → browser mic captured as PCM16 @ 24 kHz via ScriptProcessor
  → streamed over WebSocket to realtime-service (Railway)
  → Railway proxies audio frames to OpenAI Realtime API
  → OpenAI returns response.audio.delta events (PCM16 audio chunks)
  → Railway forwards them to the browser
  → browser plays chunks via AudioContext.createBufferSource()
```

**Triggered by:** the green mic button in the Kira header (only shown when `NEXT_PUBLIC_REALTIME_WS_URL` is set in Vercel).  
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

### Common errors

| Error shown in Kira chat | Cause | Fix |
|---|---|---|
| `Voice connection error: Unknown parameter: 'session.modalities'` | Wrong schema applied (gpt-4o format used on this model) | Restore the nested `audio.input`/`audio.output` format above |
| `Voice connection error: Invalid value: 'session'` | `session.type` was set to `'session'` | Must be `'realtime'` |
| `Voice connection error: Missing required parameter: 'session.type'` | `session.type` omitted | Add `type: 'realtime'` inside `session` |
| `Voice connection error: OpenAI rejected (401)` | `OPENAI_API_KEY` missing or wrong on Railway | Set the env var in Railway dashboard |
| User sees "Listening…" but hears nothing, no error | Session config accepted but output is text-only | Ensure `output_modalities: ['audio']` is present |

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

The general `AudioContext` (`audioCtxRef`) is created by `unlockAudio()` and used for standard-voice TTS silence detection. These are separate contexts.

---

## Voices available

Standard voice TTS (`/api/ai/tts`): `nova` (OpenAI TTS-1-HD)  
Live voice (Realtime API): `shimmer`
