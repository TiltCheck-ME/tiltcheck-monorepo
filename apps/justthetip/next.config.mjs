/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@tiltcheck/api-client', '@tiltcheck/auth', '@tiltcheck/types'],
};

export default nextConfig;
