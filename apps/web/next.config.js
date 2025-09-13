/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@utmify/database'],
  },
  images: {
    domains: ['localhost', 'vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },
  env: {
    CUSTOM_KEY: 'my-value',
  },
  // Optimize for Vercel deployment
  poweredByHeader: false,
  compress: true,
  // Transpile packages from workspace
  transpilePackages: ['@utmify/shared'],
}

module.exports = nextConfig