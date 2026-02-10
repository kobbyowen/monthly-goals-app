import type { NextConfig } from "next";
import { basePath } from "./basePath";

const nextConfig: NextConfig = {
  basePath: "",
  assetPrefix: basePath.endsWith("/") ? basePath : `${basePath}/`,
};

export default nextConfig;
