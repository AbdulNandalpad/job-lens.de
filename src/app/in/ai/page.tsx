'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IndiaAiPage() {
  const router = useRouter()
  // /app/ai is DACH-only: the middleware sends India users straight back here,
  // so this page points at the India home instead of looping.
  useEffect(() => { router.replace('/in/kira') }, [router])
  return null
}
