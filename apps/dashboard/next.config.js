/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => {
    console.log('Generating build ID...');
    return 'build-id-' + Date.now();
  },
};

module.exports = nextConfig;
