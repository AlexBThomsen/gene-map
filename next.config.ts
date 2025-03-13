import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.typeface.json': {
          loaders: ['raw-loader'],
          as: '*.js'
        }
      },
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    }
  }
};

export default nextConfig;
