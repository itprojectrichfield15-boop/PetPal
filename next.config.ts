import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    // Next.js 16 narrowed the default allowed `quality` values to [75] only.
    // Declaring the set we use keeps hero imagery from being silently coerced.
    qualities: [60, 75, 90],
  },
  async redirects() {
    return [
      {
        // The old "Vet Directory" listed hard-coded practices with invented
        // ratings and review counts. /vet-finder now returns real, mapped
        // practices, so the two are consolidated.
        source: "/vets",
        destination: "/vet-finder",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
