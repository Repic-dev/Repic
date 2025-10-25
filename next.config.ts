import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wtdpygwzmlzonidmofhv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  turbopack: {
    root: '..',
  },
};

export default nextConfig;
