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
    // Skip build-time optimizations to prevent database connections
    isrMemoryCacheSize: 0,
  },
  // Standalone output for Vercel
  output: 'standalone',

  // Increase static page generation timeout
  staticPageGenerationTimeout: 300,

  // Optimize for Vercel deployment with Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      })
    }
    return config
  },

  // Skip trailing slash redirects during build
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig