/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uncommon-armadillo-832.convex.cloud',
        port: '',
        pathname: '/api/storage/**',
      },
    ],
  },
};

export default nextConfig;
