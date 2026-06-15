/**
 * Lightweight error reporting for Job-Lens API routes.
 *
 * reportError() logs to the `error_logs` Supabase table and sends an email
 * alert to ADMIN_EMAILS for critical severity.
 *
 * Required Supabase migration (run once):
 *   create table if not exists error_logs (
 *     id          uuid primary key default gen_random_uuid(),
 *     created_at  timestamptz not null default now(),
 *     route       text not null,
 *     severity    text not null check (severity in ('critical','warning','info')),
 *     message     text not null,
 *     stack       text,
 *     context     jsonb
 *   );
 *   create index on error_logs (created_at desc);
 *   alter table error_logs enable row level security;
 *   -- Admins can read via service role; no anon/user access.
 */
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendAdminAlert } from '@/lib/job-case-email'

export type ErrorSeverity = 'critical' | 'warning' | 'info'

export async function reportError(opts: {
  route: string
  error: unknown
  severity?: ErrorSeverity
  context?: Record<string, unknown>
}) {
  const { route, error, severity = 'critical', context } = opts

  const message = error instanceof Error ? error.message : String(error)
  const stack   = error instanceof Error ? (error.stack ?? null) : null

  try {
    const admin = createAdminSupabase()
    await admin.from('error_logs').insert({
      route,
      severity,
      message,
      stack,
      context: context ?? null,
    })
  } catch {
    // Never let the logger crash the caller
  }

  if (severity === 'critical') {
    const lines = [
      `Route: ${route}`,
      `Error: ${message}`,
      context ? `Context: ${JSON.stringify(context, null, 2)}` : null,
      stack ? `\nStack:\n${stack}` : null,
    ].filter(Boolean).join('\n')

    sendAdminAlert({
      subject: `API error in ${route}`,
      body: lines,
    }).catch(() => null)
  }
}

/**
 * Wraps an async API handler so any unhandled exception is reported and
 * returns a clean 500 JSON response instead of an empty error page.
 *
 * Usage (in any route.ts):
 *   import { withErrorReporting } from '@/lib/error-reporter'
 *   export const GET = withErrorReporting('/api/my-route', async (req) => { ... })
 */
export function withErrorReporting<T extends (...args: never[]) => Promise<Response>>(
  route: string,
  handler: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (err) {
      await reportError({ route, error: err, severity: 'critical' })
      const { NextResponse } = await import('next/server')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }) as T
}
