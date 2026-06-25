'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IndiaAiPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/app/ai') }, [router])
  return null
}
