import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase functions are hosted externally
  async rewrites() {
    return [
      {
        source: "/api/supabase/:path*",
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
