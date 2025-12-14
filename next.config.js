/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Increase timeout for static page generation
  staticPageGenerationTimeout: 180,
  // Disable powered by header for security
  poweredByHeader: false,
}

module.exports = nextConfig