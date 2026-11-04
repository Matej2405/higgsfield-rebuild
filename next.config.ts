import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Only generated takes in this project's own Blob store get resized for the cards.
    remotePatterns: [new URL("https://9htzykjyoyf0l4mf.public.blob.vercel-storage.com/takes/**")],
  },
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
