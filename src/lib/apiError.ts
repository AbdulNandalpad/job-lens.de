// One way to read an API response on the client: never throw on a non-2xx, never lose
// the server's message. Every AI route already refunds and returns a precise
// `{ error }` — the UI's job is to show it, not replace it with a generic string.

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; message: string; credits?: number; data: unknown }

export async function readJsonOrError<T = Record<string, unknown>>(res: Response): Promise<ApiResult<T>> {
  let data: unknown = null
  try { data = await res.json() } catch { data = null }
  if (res.ok) return { ok: true, data: (data ?? {}) as T, status: res.status }

  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const serverMsg = typeof d.error === 'string' && d.error.trim() ? d.error.trim() : ''
  let message = serverMsg || `Request failed (${res.status})`
  if (res.status === 401 && !serverMsg) message = 'Your session expired — please sign in again.'
  if (res.status === 429 && !serverMsg) message = 'Too many requests. Please wait a minute.'
  if (res.status === 402 && (!serverMsg || serverMsg === 'Insufficient credits')) message = 'Not enough credits for this step.'
  const credits = typeof d.credits === 'number' ? d.credits : undefined
  return { ok: false, status: res.status, message, credits, data }
}

/** Message for a thrown error (network failure, abort) — never leaks stack traces. */
export function toUserMessage(err: unknown): string {
  if (err instanceof TypeError) return 'Network error — check your connection and try again.'
  if (err instanceof DOMException && err.name === 'AbortError') return 'Request cancelled.'
  return 'Something went wrong. Please try again.'
}
