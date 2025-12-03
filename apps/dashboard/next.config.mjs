/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Transpile workspace packages
  transpilePackages: ['@tiltcheck/api-client', '@tiltcheck/auth', '@tiltcheck/types'],
};

export default nextConfig;
