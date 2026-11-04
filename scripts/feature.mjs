// Copies chosen takes into lib/featured.json, the curated "Made with Take One" gallery.
// Takes expire from Redis after 30 days; the copy keeps the example (its media lives in
// Blob, which doesn't expire). Server-only fields are dropped, as toTake() does.
//
//   node --env-file=.env.local scripts/feature.mjs <take-id or prefix> ...
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const prefixes = process.argv.slice(2);
if (!prefixes.length) throw new Error("Pass the take IDs (or unique prefixes) to feature, in display order.");
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

let cursor = "0";
const keys = [];
do {
  const [next, batch] = await redis.scan(cursor, { match: "job:*", count: 500 });
  cursor = String(next);
  keys.push(...batch);
} while (cursor !== "0");

const featured = [];
for (const prefix of prefixes) {
  const matches = keys.filter((key) => key.startsWith(`job:${prefix}`));
  if (matches.length !== 1) throw new Error(`${prefix} matches ${matches.length} takes`);
  const job = await redis.get(matches[0]);
  if (job.status !== "succeeded") throw new Error(`${prefix} is ${job.status}`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { visitorId, ip, creditDay, modelId, operation, lastCheckedAt, ...take } = job;
  featured.push(take);
}

const out = fileURLToPath(new URL("../lib/featured.json", import.meta.url));
writeFileSync(out, JSON.stringify(featured, null, 2) + "\n");
console.log(`wrote ${featured.length} takes to ${out}`);
