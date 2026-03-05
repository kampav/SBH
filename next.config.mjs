import { withSentryConfig } from '@sentry/nextjs'
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
  },
  serverExternalPackages: ['firebase-admin'],
}

// Wrap with Serwist PWA in production build
async function buildConfig(phase) {
  const { default: withSerwist } = await import('@serwist/next')

  const serwistConfig = withSerwist({
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
    disable: phase !== PHASE_PRODUCTION_BUILD,
  })(nextConfig)

  // Only wrap with Sentry source map upload if token is available
  const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN)
  return hasSentryAuth
    ? withSentryConfig(serwistConfig, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        silent: true,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: false,
      })
    : serwistConfig
}

export default buildConfig
