import type { Aspect, Kind, Tier } from "./catalog";

// One generation. Safe to send to the browser: server-only fields live on Job.
export type TakeStatus = "queued" | "running" | "succeeded" | "failed";

export type Take = {
  id: string;
  take: number;
  kind: Kind;
  tier: Tier;
  presetId: string | null;
  prompt: string;
  finalPrompt: string;
  aspect: Aspect;
  duration: number | null;
  startImageUrl: string | null;
  parentId: string | null;
  modelName: string;
  credits: number;
  costUsd: number;
  estimateSeconds: number;
  status: TakeStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  output: { url: string; mediaType: string } | null;
  error: string | null;
  refunded: boolean;
};

export type CreateTakeInput = {
  kind: Kind;
  tier: Tier;
  presetId: string | null;
  prompt: string;
  aspect: Aspect;
  duration: number | null;
  startImageUrl: string | null;
  parentId: string | null;
};
