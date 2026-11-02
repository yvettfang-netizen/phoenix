/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.ASKWISE_BUILD_MODE === "server" ? undefined : "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
