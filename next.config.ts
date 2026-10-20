import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (`cacheComponents: true`) is intentionally left off: every
  // page here depends on the session cookie and the database, so the standard
  // request-time rendering model fits. Turning it on makes `cookies()` reads
  // outside a <Suspense> boundary a build error.

  // Tailwind v4 runs through its official Turbopack loader (no PostCSS config needed).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
