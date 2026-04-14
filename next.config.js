/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@/lib/ai", "@nexus/ui"],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
