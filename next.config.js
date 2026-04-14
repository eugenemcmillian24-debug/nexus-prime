/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed non-existent "@nexus/ui" — transpilePackages only needed for local monorepo packages
  // serverActions is stable in Next.js 14 — no longer needs experimental flag
};

module.exports = nextConfig;
