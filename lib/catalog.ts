// The model lineup, picked by intent rather than brand. Prices are copied from the
// AI Gateway catalog (https://ai-gateway.vercel.sh/v1/models) on 2026-11-04; one
// credit is one US cent of that cost, rounded up, so the price a visitor sees is the
// price the project pays.

export type Kind = "image" | "video";
export type Tier = "draft" | "standard" | "cinematic";
export type Aspect = "16:9" | "9:16" | "1:1";

export const TIERS: Tier[] = ["draft", "standard", "cinematic"];

type ProviderOptions = Record<string, Record<string, string | boolean>>;

type ImageModel = {
  modelId: string;
  name: string;
  costUsd: number;
  aspects: Aspect[];
  // For models that ignore aspectRatio and need the exact pixel size instead.
  sizes?: Record<Aspect, `${number}x${number}`>;
  providerOptions?: ProviderOptions;
  estimateSeconds: number;
};

type VideoModel = {
  name: string;
  // Some providers ship text-to-video and image-to-video as separate model IDs.
  textModelId: string;
  imageModelId: string;
  costPerSecondUsd: number;
  durations: number[];
  aspects: Aspect[];
  resolutions: Record<Aspect, `${number}x${number}`>;
  generateAudio: boolean;
  providerOptions?: ProviderOptions;
  estimateSeconds: number;
};

export const TIER_COPY: Record<Tier, { label: string; hint: Record<Kind, string> }> = {
  draft: {
    label: "Draft",
    hint: { image: "Fast and nearly free. For finding the idea.", video: "480p, no sound. For checking the motion." },
  },
  standard: {
    label: "Standard",
    hint: { image: "Sharper detail and better text.", video: "720p with smoother motion." },
  },
  cinematic: {
    label: "Cinematic",
    hint: { image: "The most detail and the best light.", video: "720p with generated sound. The final take." },
  },
};

// Every image model here was checked to return the shape that was asked for. FLUX 1.1
// Pro and FLUX 2 Klein were dropped because they return 4:3 or square without a warning.
export const IMAGE_MODELS: Record<Tier, ImageModel> = {
  draft: { modelId: "spacexai/grok-imagine-image", name: "Grok Imagine", costUsd: 0.02, aspects: ["16:9", "9:16", "1:1"], estimateSeconds: 8 },
  standard: {
    modelId: "bytedance/seedream-5.0-pro",
    name: "Seedream 5.0 Pro",
    costUsd: 0.035,
    aspects: ["16:9", "9:16", "1:1"],
    sizes: { "16:9": "2560x1440", "9:16": "1440x2560", "1:1": "2048x2048" },
    // Seedream stamps "AI generated" into the corner by default.
    providerOptions: { bytedance: { watermark: false } },
    estimateSeconds: 40,
  },
  cinematic: { modelId: "bfl/flux-pro-1.1-ultra", name: "FLUX 1.1 Pro Ultra", costUsd: 0.06, aspects: ["16:9", "9:16", "1:1"], estimateSeconds: 12 },
};

export const VIDEO_MODELS: Record<Tier, VideoModel> = {
  draft: {
    name: "Seedance 1.0 Pro Fast",
    textModelId: "bytedance/seedance-v1.0-pro-fast",
    imageModelId: "bytedance/seedance-v1.0-pro-fast",
    costPerSecondUsd: 0.0097, // 480p
    durations: [5, 10],
    aspects: ["16:9", "9:16", "1:1"],
    // Seedance's 480p sizes; a square 480x480 is refused.
    resolutions: { "16:9": "864x480", "9:16": "480x864", "1:1": "640x640" },
    generateAudio: false,
    estimateSeconds: 45,
  },
  standard: {
    name: "Kling 2.5 Turbo",
    textModelId: "klingai/kling-v2.5-turbo-t2v",
    imageModelId: "klingai/kling-v2.5-turbo-i2v",
    costPerSecondUsd: 0.042, // std mode
    durations: [5, 10],
    aspects: ["16:9", "9:16", "1:1"],
    // Kling accepts a 720x720 square request and returns 960x960.
    resolutions: { "16:9": "1280x720", "9:16": "720x1280", "1:1": "720x720" },
    generateAudio: false,
    providerOptions: { klingai: { mode: "std" } },
    estimateSeconds: 90,
  },
  cinematic: {
    name: "Veo 3.1 Fast",
    textModelId: "google/veo-3.1-fast-generate-001",
    imageModelId: "google/veo-3.1-fast-generate-001",
    costPerSecondUsd: 0.15, // 720p with audio
    durations: [4, 8],
    aspects: ["16:9", "9:16"],
    resolutions: { "16:9": "1280x720", "9:16": "720x1280", "1:1": "720x720" },
    generateAudio: true,
    estimateSeconds: 75,
  },
};

export function toCredits(costUsd: number) {
  return Math.ceil(Math.round(costUsd * 10000) / 100);
}

export type Quote = {
  modelId: string;
  modelName: string;
  costUsd: number;
  credits: number;
  estimateSeconds: number;
};

export function quote(input: { kind: Kind; tier: Tier; duration?: number; hasStartImage?: boolean }): Quote {
  if (input.kind === "image") {
    const model = IMAGE_MODELS[input.tier];
    return { modelId: model.modelId, modelName: model.name, costUsd: model.costUsd, credits: toCredits(model.costUsd), estimateSeconds: model.estimateSeconds };
  }
  const model = VIDEO_MODELS[input.tier];
  const duration = input.duration ?? model.durations[0];
  const costUsd = model.costPerSecondUsd * duration;
  return {
    modelId: input.hasStartImage ? model.imageModelId : model.textModelId,
    modelName: model.name,
    costUsd,
    credits: toCredits(costUsd),
    estimateSeconds: model.estimateSeconds,
  };
}

export function aspectsFor(kind: Kind, tier: Tier): Aspect[] {
  return kind === "image" ? IMAGE_MODELS[tier].aspects : VIDEO_MODELS[tier].aspects;
}

export function durationsFor(tier: Tier): number[] {
  return VIDEO_MODELS[tier].durations;
}
