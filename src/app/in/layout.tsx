import AIWidget from '@/components/AIWidget'

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIWidget market="in" />
    </>
  )
}
