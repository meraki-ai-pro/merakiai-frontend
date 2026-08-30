import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'

const siteUrl = new URL('https://www.merakiai.online')
const siteTitle = 'Meraki AI – Adaptive AI Tutor for University Learning'
const siteDescription =
  'Learn Statistics, Calculus, and university-level subjects with course-grounded explanations, guided review, assessments, voice questions, and tutor-style video lessons.'

// Inter — clean, highly readable sans-serif at all sizes
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// JetBrains Mono — for code blocks
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteTitle,
    template: '%s | Meraki AI',
  },
  description: siteDescription,
  applicationName: 'Meraki AI',
  keywords: [
    'AI tutor',
    'university learning',
    'online learning Ghana',
    'Statistics tutor',
    'Calculus tutor',
    'AI educational assistant',
    'exam revision',
    'interactive assessments',
  ],
  authors: [{ name: 'Meraki AI', url: '/' }],
  creator: 'Meraki AI',
  publisher: 'Meraki AI',
  category: 'education',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/brand/meraki-icon-color.png', type: 'image/png' }],
    shortcut: '/brand/meraki-icon-color.png',
    apple: [{ url: '/brand/meraki-icon-color.png', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: '/',
    siteName: 'Meraki AI',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/brand/meraki-logo-color.png',
        width: 662,
        height: 191,
        alt: 'Meraki AI adaptive learning platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/brand/meraki-logo-color.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  other: {
    'geo.region': 'GH',
    'geo.placename': 'Ghana',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#edf6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased text-base">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                  fontSize: '14px',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
