/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    "@tiltcheck/types",
    "@tiltcheck/db",
    "@tiltcheck/shared",
    "@tiltcheck/justthetip",
    "@tiltcheck/auth",
    "@tiltcheck/config"
  ],
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Subdomain Consolidation (Phase 9)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'hub.tiltcheck.me' }],
        destination: 'https://tiltcheck.me/dashboard/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'docs.tiltcheck.me' }],
        destination: 'https://tiltcheck.me/docs/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'control.tiltcheck.me' }],
        destination: 'https://tiltcheck.me/admin/:path*',
        permanent: true,
      },
      // Legacy HTML rewrites
      {
        source: '/trust-scores.html',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/casinos.html',
        destination: '/casinos',
        permanent: true,
      },
      {
        source: '/hub.html',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/arena/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://arena.tiltcheck.me/:path*' 
          : 'http://localhost:3010/:path*',
      },
      {
        source: '/admin/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://control-room.tiltcheck.me/:path*' 
          : 'http://localhost:3001/:path*',
      },
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'https://api.tiltcheck.me/:path*'
          : 'http://localhost:8080/:path*',
      },
      {
        source: '/analyzer/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'https://api.tiltcheck.me/analyzer/:path*'
          : 'http://localhost:8080/analyzer/:path*',
      },
    ];
  },
};

export default nextConfig;
