/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Transpile workspace packages
  transpilePackages: ['@tiltcheck/api-client', '@tiltcheck/auth', '@tiltcheck/types'],
  // Use modern ESLint config (flat config) to avoid deprecated options warning
  eslint: {
    // Use the ESLint configuration from the root
    dirs: ['src'],
  },
};

export default nextConfig;
