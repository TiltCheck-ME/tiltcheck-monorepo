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
      {
        source: '/trust-scores.html',
        destination: '/casinos',
        permanent: true,
      },
      {
        source: '/casinos.html',
        destination: '/casinos',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
