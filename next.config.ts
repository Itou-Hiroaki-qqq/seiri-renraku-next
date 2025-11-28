import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // 本番だけ basePath を追加
  basePath: isProd ? "/app/seirishite-renrakukun" : "",
};

export default nextConfig;