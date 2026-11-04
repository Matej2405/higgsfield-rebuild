// Generates the preset thumbnails in public/presets/ through the app's own API, so
// every preview is a real take made with that preset (its placeholder as the prompt).
//
//   node scripts/generate-previews.mjs http://localhost:3000 [preset-id ...]
//
// Images are made at Cinematic quality. Videos are made at Draft quality and keep one
// frame, taken with macOS Quick Look (qlmanage). Costs about $0.70 for the full set.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PRESETS } from "../lib/presets.ts";

const [base, ...only] = process.argv.slice(2);
if (!base) throw new Error("Pass the app's base URL, e.g. http://localhost:3000");
const presets = PRESETS.filter((p) => !only.length || only.includes(p.id));
const outDir = fileURLToPath(new URL("../public/presets/", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "take-one-previews-"));
mkdirSync(outDir, { recursive: true });

let cookie = "";
async function api(path, init = {}) {
  const response = await fetch(base + path, { ...init, headers: { "content-type": "application/json", cookie } });
  const set = response.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${data.error}`);
  return data;
}

await api("/api/takes");
const started = new Map();
for (const preset of presets) {
  const { take } = await api("/api/takes", {
    method: "POST",
    body: JSON.stringify({
      kind: preset.kind,
      tier: preset.kind === "image" ? "cinematic" : "draft",
      presetId: preset.id,
      prompt: preset.placeholder,
      aspect: "16:9",
      duration: preset.kind === "video" ? 5 : null,
      startImageUrl: null,
      parentId: null,
    }),
  });
  started.set(take.id, preset);
  console.log("started", preset.id);
}

while (started.size) {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const { takes } = await api("/api/takes");
  for (const take of takes.filter((t) => started.has(t.id))) {
    const preset = started.get(take.id);
    if (take.status === "failed") {
      console.log("failed", preset.id, take.error);
      started.delete(take.id);
    } else if (take.status === "succeeded") {
      started.delete(take.id);
      await save(preset, take.output.url);
    }
  }
}

async function save(preset, url) {
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  let still = bytes;
  if (preset.kind === "video") {
    const video = join(work, `${preset.id}.mp4`);
    writeFileSync(video, bytes);
    execFileSync("qlmanage", ["-t", "-s", "900", "-o", work, video], { stdio: "ignore" });
    const frame = readdirSync(work).find((f) => f.startsWith(`${preset.id}.mp4`) && f.endsWith(".png"));
    still = join(work, frame);
  }
  // Tiles are 4:3 and about 120 px wide; 360 px covers 3x screens.
  await sharp(still).resize(360, 270, { fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toFile(join(outDir, `${preset.id}.jpg`));
  console.log("saved", preset.id, "from", url);
}
