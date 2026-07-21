import type { NextConfig } from "next";

// Dev-only cross-origin allowlist (LAN IP, tunnels). Set via env, not hardcoded.
// Example: NEXT_DEV_ORIGINS="10.0.0.5,my-tunnel.ngrok-free.dev"
const devOrigins = (process.env.NEXT_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
