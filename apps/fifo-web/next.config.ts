import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@binance-fifo/binance-client",
    "@binance-fifo/db",
    "@binance-fifo/fifo-engine",
    "@binance-fifo/shared"
  ]
};

export default nextConfig;
