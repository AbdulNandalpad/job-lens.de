/**
 * POST /api/job-case/upload-video
 * Returns a signed upload URL for the private Supabase Storage bucket.
 *
 * GDPR:
 * - Bucket "job-case-videos" is PRIVATE (not public)
 * - Path: {user_id}/{temp_id}/pitch.webm
 * - Storage region must be EU (configured in Supabase dashboard)
 * - Videos are AES-256 encrypted at rest by Supabase
 * - Access only via short-lived signed URLs (never public)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { nanoid } from 'nanoid'

const BUCKET = 'job-case-videos'
// Signed upload URL valid for 10 minutes
const UPLOAD_EXPIRY_SECONDS = 600

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mimeType } = await req.json()
    const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm'
    const tempId = nanoid(10)
    const storagePath = `${user.id}/${tempId}/pitch.${ext}`

    const admin = createAdminSupabase()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('Signed upload URL error:', error)
      return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl:   data.signedUrl,
      storagePath,
      token:       data.token,
    })
  } catch (err) {
    console.error('/api/job-case/upload-video error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
