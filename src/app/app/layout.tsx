import AIWidget from '@/components/AIWidget'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIWidget />
    </>
  )
}
