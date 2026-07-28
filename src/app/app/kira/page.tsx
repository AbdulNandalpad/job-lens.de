'use client'

import Navbar from '../components/Navbar'
import KiraHome from '@/components/KiraHome'

export default function KiraPage() {
  return (
    <>
      <Navbar />
      <KiraHome market="eu" />
    </>
  )
}
