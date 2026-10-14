const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Cloudflare Turnstile (auth forms) loads its script from Cloudflare; its
  // challenge iframe and API calls are already covered by https: below.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'self' https:",
  // Production only. Under `next dev` on http://localhost it turned Next's
  // trailing-slash redirect for /api/backend/sessions/ into an https request
  // that cannot connect, so no session could be listed or created locally.
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Playwright and containerised development servers may reach the local app
  // through either loopback hostname. Next.js 16 otherwise rejects its own
  // development chunks as cross-origin requests.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async redirects() {
    return [
      {
        source: '/instructor/:path*',
        destination: '/lecturer/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
