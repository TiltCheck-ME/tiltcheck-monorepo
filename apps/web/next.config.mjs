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
};

export default nextConfig;
