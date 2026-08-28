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
