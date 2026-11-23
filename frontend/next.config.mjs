/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://enterprise-ai-backend-svz0.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;

