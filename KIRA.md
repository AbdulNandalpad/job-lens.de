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

## OpenAI Realtime API — correct session.update format

This is the exact format the service sends after `openaiWs.on('open')`. Getting any field wrong causes silent fallback to text-only output (no audio) or an explicit error.

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "modalities": ["audio", "text"],
    "instructions": "<system prompt>",
    "voice": "shimmer",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": { "model": "whisper-1" },
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.6,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 800
    }
  }
}
```

### Field rules

| Field | Valid values | Notes |
|---|---|---|
| `session.type` | `"realtime"` or `"transcription"` | Required. `"realtime"` for voice chat. |
| `modalities` | `["audio","text"]` | Both needed — text for transcripts, audio for playback. |
| `voice` | `alloy` `ash` `ballad` `coral` `echo` `sage` `shimmer` `verse` | `nova` is TTS-only, not available here. `marin` does not exist. |
| `input_audio_format` | `pcm16` `g711_ulaw` `g711_alaw` | Must be `pcm16` — client sends raw PCM16 at 24 kHz. |
| `output_audio_format` | `pcm16` | Client decodes PCM16 chunks via `AudioContext`. |
| `turn_detection.type` | `server_vad` | Client-side VAD is not used; server detects speech boundaries. |

### Common errors

| Error message | Cause | Fix |
|---|---|---|
| `Missing required parameter: 'session.type'` | `session.type` field was omitted entirely | Add `"type": "realtime"` to the session object |
| `Invalid value: 'session'. Supported values are: 'realtime' and 'transcription'` | `session.type` was set to `"session"` | Change to `"type": "realtime"` |
| `Voice connection error: …` shown in chat | OpenAI rejected the WebSocket upgrade or `unexpected-response` fired | Check Railway logs; usually invalid model name or missing API key |
| User hears nothing, state shows "Listening…" then nothing | `modalities` missing or wrong, or `output_audio_format` not set | OpenAI defaults to text-only — fix the session.update fields |

### Previous broken format (do not use)

```js
// WRONG — this was the original code before fix
session: {
  type: 'realtime',            // only correct field
  output_modalities: ['audio'], // wrong key (should be modalities)
  audio: {                      // this nesting doesn't exist in the API
    input: { format: { type: 'audio/pcm', rate: 24000 }, turn_detection: {...} },
    output: { format: {...}, voice: 'marin', speed: 1.1 }
  }
}
```

OpenAI ignored the unknown fields entirely and produced text-only output. The user saw "Listening…" (VAD still works via the model's built-in defaults) but Kira never spoke.

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
