import { put } from "@vercel/blob";
import {
  experimental_getVideoStatus as getVideoStatus,
  experimental_startVideo as startVideo,
  generateImage,
  type JSONValue,
} from "ai";
import { after } from "next/server";
import { aspectsFor, durationsFor, IMAGE_MODELS, quote, VIDEO_MODELS } from "../catalog";
import { buildPrompt, presetById } from "../presets";
import type { CreateTakeInput, Take } from "../take";
import { creditDay, refundCredits, reserveCredits } from "./credits";
import { redis } from "./redis";

type Job = Take & {
  visitorId: string;
  ip: string;
  creditDay: string;
  modelId: string;
  operation: JSONValue | null;
  lastCheckedAt: number | null;
};

const JOB_TTL_SECONDS = 60 * 60 * 24 * 30;
const STATUS_CHECK_INTERVAL_MS = 4000;
const IMAGE_TIMEOUT_MS = 3 * 60 * 1000;
const VIDEO_TIMEOUT_MS = 15 * 60 * 1000;

const jobKey = (id: string) => `job:${id}`;
const listKey = (visitor: string) => `visitor:${visitor}:jobs`;

export type CreateResult = { ok: true; take: Take } | { ok: false; status: number; error: string; code?: string };

export async function createJob(input: CreateTakeInput, visitorId: string, ip: string): Promise<CreateResult> {
  const preset = presetById(input.presetId);
  if (input.presetId && (!preset || preset.kind !== input.kind)) return { ok: false, status: 400, error: "That preset isn't available for this mode." };
  const prompt = input.prompt.trim();
  if (!prompt && !input.startImageUrl) return { ok: false, status: 400, error: "Describe what you want to see." };
  if (prompt.length > 1200) return { ok: false, status: 400, error: "Keep the description under 1,200 characters." };
  if (!aspectsFor(input.kind, input.tier).includes(input.aspect)) return { ok: false, status: 400, error: "That shape isn't available for this quality." };
  if (input.kind === "video" && !durationsFor(input.tier).includes(input.duration ?? -1)) return { ok: false, status: 400, error: "That length isn't available for this quality." };
  if (input.startImageUrl && (input.kind !== "video" || !isOurBlob(input.startImageUrl))) return { ok: false, status: 400, error: "Start images must be uploaded here first." };

  const q = quote({ kind: input.kind, tier: input.tier, duration: input.duration ?? undefined, hasStartImage: Boolean(input.startImageUrl) });
  const reserved = await reserveCredits(visitorId, ip, q.credits);
  if (!reserved.ok) {
    const error =
      reserved.reason === "global"
        ? "Take One has reached today's spending cap for everyone. Generation resumes at midnight UTC."
        : `This take costs ${q.credits} credits and you have ${reserved.remaining} left today. Pick Draft quality or a shorter length, or come back after midnight UTC.`;
    return { ok: false, status: 402, error, code: reserved.reason === "global" ? "global_cap" : "insufficient_credits" };
  }

  const take = await redis().incr(`visitor:${visitorId}:take`);
  const job: Job = {
    id: crypto.randomUUID(),
    take,
    kind: input.kind,
    tier: input.tier,
    presetId: preset?.id ?? null,
    prompt,
    finalPrompt: buildPrompt(prompt || "Animate this image naturally", preset),
    aspect: input.aspect,
    duration: input.kind === "video" ? input.duration : null,
    startImageUrl: input.startImageUrl,
    parentId: input.parentId,
    modelName: q.modelName,
    credits: q.credits,
    costUsd: q.costUsd,
    estimateSeconds: await estimateSeconds(q.modelId, q.estimateSeconds),
    status: "queued",
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    output: null,
    error: null,
    refunded: false,
    visitorId,
    ip,
    creditDay: creditDay(),
    modelId: q.modelId,
    operation: null,
    lastCheckedAt: null,
  };
  await save(job);
  await redis().multi().lpush(listKey(visitorId), job.id).ltrim(listKey(visitorId), 0, 199).exec();

  after(() => (job.kind === "image" ? runImage(job) : beginVideo(job)));
  return { ok: true, take: toTake(job) };
}

export async function listTakes(visitorId: string): Promise<Take[]> {
  const ids = await redis().lrange<string>(listKey(visitorId), 0, 59);
  if (!ids.length) return [];
  const jobs = (await redis().mget<(Job | null)[]>(...ids.map(jobKey))).filter((j): j is Job => Boolean(j));
  const refreshed = await Promise.all(jobs.map((job) => (isActive(job) ? refresh(job) : job)));
  return refreshed.map(toTake);
}

export async function getTake(visitorId: string, id: string): Promise<Take | null> {
  const job = await load(id);
  if (!job || job.visitorId !== visitorId) return null;
  return toTake(isActive(job) ? await refresh(job) : job);
}

async function runImage(job: Job) {
  const model = IMAGE_MODELS[job.tier];
  await save({ ...job, status: "running", startedAt: Date.now() });
  try {
    const { image } = await generateImage({
      model: job.modelId,
      prompt: job.finalPrompt,
      ...(model.sizes ? { size: model.sizes[job.aspect] } : { aspectRatio: job.aspect }),
      providerOptions: model.providerOptions,
      abortSignal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    const ext = image.mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const blob = await put(`takes/${job.id}.${ext}`, Buffer.from(image.uint8Array), { access: "public", contentType: image.mediaType });
    await succeed(job.id, { url: blob.url, mediaType: image.mediaType });
  } catch (error) {
    await fail(job.id, error);
  }
}

async function beginVideo(job: Job) {
  const model = VIDEO_MODELS[job.tier];
  try {
    const { operation } = await startVideo({
      model: job.modelId,
      prompt: job.startImageUrl ? { image: job.startImageUrl, text: job.finalPrompt } : job.finalPrompt,
      duration: job.duration ?? model.durations[0],
      aspectRatio: job.aspect,
      resolution: model.resolutions[job.aspect],
      generateAudio: model.generateAudio,
      providerOptions: model.providerOptions,
      // Our own retries of this start must never bill a second generation.
      headers: { "idempotency-key": job.id },
    });
    const now = Date.now();
    await save({ ...(await load(job.id))!, status: "running", startedAt: now, operation, lastCheckedAt: now });
  } catch (error) {
    await fail(job.id, error);
  }
}

// Advances a running job: asks AI Gateway about a video, or gives up on work that
// has been silent for too long (the function running it may have died).
async function refresh(job: Job): Promise<Job> {
  const age = Date.now() - job.createdAt;
  if (job.kind === "image" && age > IMAGE_TIMEOUT_MS + 30_000) return (await fail(job.id, new Error("timed out"))) ?? job;
  if (job.kind === "video" && age > VIDEO_TIMEOUT_MS) return (await fail(job.id, new Error("timed out"))) ?? job;
  if (job.kind !== "video" || job.status !== "running" || !job.operation) return job;
  if (job.lastCheckedAt && Date.now() - job.lastCheckedAt < STATUS_CHECK_INTERVAL_MS) return job;

  const lock = await redis().set(`lock:${job.id}`, 1, { nx: true, ex: 60 });
  if (!lock) return job;
  try {
    const status = await getVideoStatus(job.modelId, { operation: job.operation });
    if (status.status === "pending") {
      const next = { ...job, lastCheckedAt: Date.now() };
      await save(next);
      return next;
    }
    if (status.status === "error") return (await fail(job.id, new Error(status.error))) ?? job;

    const video = status.videos[0];
    if (!video) return (await fail(job.id, new Error("no video returned"))) ?? job;
    const body = video.type === "url" ? (await fetchOk(video.url)).body! : video.type === "base64" ? Buffer.from(video.data, "base64") : Buffer.from(video.data);
    const mediaType = video.mediaType || "video/mp4";
    const blob = await put(`takes/${job.id}.mp4`, body, { access: "public", contentType: mediaType, multipart: true });
    return (await succeed(job.id, { url: blob.url, mediaType })) ?? job;
  } catch (error) {
    // A failed status check is not a failed generation; try again on the next poll.
    console.error("video status check failed", job.id, error);
    return job;
  } finally {
    await redis().del(`lock:${job.id}`);
  }
}

async function succeed(id: string, output: NonNullable<Take["output"]>) {
  const job = await load(id);
  if (!job || job.status === "succeeded" || job.status === "failed") return job;
  const finishedAt = Date.now();
  const next: Job = { ...job, status: "succeeded", output, finishedAt };
  await save(next);
  await recordDuration(job.modelId, (finishedAt - (job.startedAt ?? job.createdAt)) / 1000);
  return next;
}

async function fail(id: string, error: unknown) {
  const job = await load(id);
  if (!job || job.status === "succeeded" || job.status === "failed") return job;
  console.error("take failed", id, error);
  if (!job.refunded) await refundCredits(job.visitorId, job.ip, job.credits, job.creditDay);
  const next: Job = { ...job, status: "failed", error: describeError(error), finishedAt: Date.now(), refunded: true };
  await save(next);
  return next;
}

function describeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  // Gateway billing refusals, e.g. "Video generation requires a minimum balance of $10".
  if (/budget|balance|credit card|insufficient (funds|credits)|quota/i.test(message))
    return "Generation is paused because the project's spending limit has been reached.";
  if (/safety|policy|moderat|blocked|sensitive/i.test(message))
    return "The model declined this prompt under its content rules. Try describing it differently.";
  if (/timed out|timeout/i.test(message)) return "The model took too long to answer.";
  return `The model returned an error: ${message.slice(0, 160)}`;
}

async function recordDuration(modelId: string, seconds: number) {
  const previous = await redis().hget<number>("stats:seconds", modelId);
  const next = previous ? previous * 0.7 + seconds * 0.3 : seconds;
  await redis().hset("stats:seconds", { [modelId]: Math.round(next) });
}

export async function estimateSeconds(modelId: string, fallback: number) {
  return (await redis().hget<number>("stats:seconds", modelId)) ?? fallback;
}

export async function measuredEstimates() {
  return (await redis().hgetall<Record<string, number>>("stats:seconds")) ?? {};
}

async function fetchOk(url: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`could not download the video (${response.status})`);
  return response;
}

function isActive(job: Job) {
  return job.status === "queued" || job.status === "running";
}

function isOurBlob(url: string) {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function load(id: string) {
  return redis().get<Job>(jobKey(id));
}

async function save(job: Job) {
  await redis().set(jobKey(job.id), job, { ex: JOB_TTL_SECONDS });
}

// Strips the server-only fields before a job goes to the browser.
function toTake(job: Job): Take {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { visitorId, ip, creditDay, modelId, operation, lastCheckedAt, ...take } = job;
  return take;
}
