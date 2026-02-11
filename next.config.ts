import type { NextConfig } from "next";
import { BASE_PATH, ASSET_PREFIX } from "./config";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  assetPrefix: ASSET_PREFIX,
};

export default nextConfig;

