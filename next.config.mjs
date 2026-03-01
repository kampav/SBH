/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker/Cloud Run deployment
  output: 'standalone',
  // Allow YouTube thumbnails in <Image>
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
  },
}

export default nextConfig
