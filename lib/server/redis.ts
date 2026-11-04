import { Redis } from "@upstash/redis";

let client: Redis | null = null;

// The Vercel Marketplace integration names its variables KV_REST_API_*; a direct
// Upstash setup uses UPSTASH_REDIS_REST_*. Created lazily so `next build` works
// before the store is connected.
export function redis() {
  if (client) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN.");
  client = new Redis({ url, token });
  return client;
}
