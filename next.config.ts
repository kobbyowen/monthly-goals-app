import path from 'path';
import type { NextConfig } from "next";
import { BASE_PATH, ASSET_PREFIX } from "./config";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  assetPrefix: ASSET_PREFIX,
  turbopack: {},
  webpack: (config) => {
    if (!config.resolve) config.resolve = {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@components': path.resolve(__dirname, 'app/components'),
      '@hooks': path.resolve(__dirname, 'app/hooks'),
      '@lib': path.resolve(__dirname, 'app/lib'),
      '@api': path.resolve(__dirname, 'app/lib/api'),
      '@services': path.resolve(__dirname, 'app/services'),
      '@repositories': path.resolve(__dirname, 'app/repositories'),
      '@utils': path.resolve(__dirname, 'app/utils'),
      '@server': path.resolve(__dirname, 'server'),
      '@pages': path.resolve(__dirname, 'app/(pages)'),
    };
    return config;
  },
};

export default nextConfig;

