// DB-backed resolver for the application package (pure logic in ./pricingCore).
import { createAdminSupabase } from '@/lib/supabase-server'
import { BUNDLE } from '@/lib/constants'
import { computeBundle, INACTIVE_BUNDLE, type BundleState, type UsageRow } from '@/lib/pricingCore'

export { jobKey, computeBundle } from '@/lib/pricingCore'
export type { BundleState, UsageRow } from '@/lib/pricingCore'

export async function resolveBundle(userId: string, key: string): Promise<BundleState> {
  try {
    const admin = createAdminSupabase()
    const cutoff = new Date(Date.now() - BUNDLE.windowHours * 3600_000).toISOString()
    const { data, error } = await admin
      .from('usage_events')
      .select('action, credits_used, created_at')
      .eq('user_id', userId)
      .eq('job_key', key)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { console.error('[pricing] resolveBundle query failed:', error.message); return INACTIVE_BUNDLE }
    return computeBundle((data ?? []) as UsageRow[])
  } catch (err) {
    console.error('[pricing] resolveBundle failed:', err instanceof Error ? err.message : err)
    return INACTIVE_BUNDLE
  }
}
