/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexus/ai", "@nexus/ui"],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
