import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
  },
  serverExternalPackages: ['firebase-admin'],
}

// Only wrap with Sentry if auth token is available (CI/CD), skip locally + Docker
const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN)

export default hasSentryAuth
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig
