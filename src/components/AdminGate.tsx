'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ADMIN_EMAILS = ['sap.rashid@gmail.com']

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      if (ADMIN_EMAILS.includes(email)) {
        setAllowed(true)
      } else {
        router.replace('/app')
      }
    })
  }, [router])

  if (!allowed) return null
  return <>{children}</>
}
