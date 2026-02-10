import type { NextConfig } from "next";
import { basePath } from "./basePath";

const nextConfig: NextConfig = {
  basePath,
  // Ensure asset prefix matches the basePath so static assets are
  // requested from the same mounted path in deployments that
  // serve the app under a subpath.
  assetPrefix: basePath.endsWith("/") ? basePath : `${basePath}/`,
};

export default nextConfig;
