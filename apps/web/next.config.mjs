/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Updated for Cloud Run Standalone mode to reduce image size
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
