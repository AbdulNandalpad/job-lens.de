import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright'],
  webpack: (config: { resolve: { alias: Record<string, boolean> } }) => {
    // Prevent @react-pdf/renderer's canvas dependency from being bundled server-side
    config.resolve.alias.canvas = false
    return config
  },
};

export default nextConfig;
