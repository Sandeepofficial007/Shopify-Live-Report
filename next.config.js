/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Suppress punycode deprecation warning from googleapis
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, punycode: false };
    return config;
  },
};

module.exports = nextConfig;
