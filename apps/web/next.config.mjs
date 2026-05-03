// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Pin Turbopack's workspace root to the monorepo root (apps/web -> ../..).
  // Without this, Next.js can pick up stray pnpm-workspace.yaml files higher
  // up the filesystem (e.g. in a developer's home directory) and silently
  // resolve modules from the wrong root.
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
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
      {
        source: '/',
        has: [{ type: 'host', value: 'hub.tiltcheck.me' }],
        destination: 'https://dashboard.tiltcheck.me/dashboard',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'hub.tiltcheck.me' }],
        destination: 'https://dashboard.tiltcheck.me/:path*',
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
