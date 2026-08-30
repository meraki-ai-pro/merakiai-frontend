import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Meraki AI Board Preview' },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
}

export default function BoardPreviewLayout({ children }: { children: React.ReactNode }) {
  return children
}
