import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Meraki AI – Adaptive AI Tutor',
    short_name: 'Meraki AI',
    description:
      'Course-grounded explanations, review, assessments, voice questions, and tutor-style video lessons.',
    start_url: '/',
    display: 'standalone',
    background_color: '#edf6fb',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/brand/meraki-icon-color.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
