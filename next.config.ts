import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 使用 webpack 而非 Turbopack（2GB 服务器内存友好）
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
