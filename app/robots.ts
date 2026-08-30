import type { MetadataRoute } from 'next'

const siteUrl = 'https://www.merakiai.online'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/auth/',
        '/board-preview/',
        '/dashboard/',
        '/lecturer/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
