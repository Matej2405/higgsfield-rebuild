"use client";

import { useRef, useState } from "react";
import { aspectsFor, durationsFor, quote, TIER_COPY, TIERS, type Aspect, type Kind, type Tier } from "@/lib/catalog";
import { PRESETS, presetById } from "@/lib/presets";
import { MoveDiagram } from "./move-diagram";

export type Draft = {
  kind: Kind;
  presetId: string | null;
  prompt: string;
  tier: Tier;
  aspect: Aspect;
  duration: number;
  startImageUrl: string | null;
  parentId: string | null;
};

// Keeps a draft valid after any change: the preset must match the mode, and the
// shape and length must be ones the chosen quality supports.
export function normalize(draft: Draft): Draft {
  const preset = presetById(draft.presetId);
  const presetId = preset && preset.kind === draft.kind ? preset.id : null;
  const aspects = aspectsFor(draft.kind, draft.tier);
  const durations = durationsFor(draft.tier);
  return {
    ...draft,
    presetId,
    aspect: aspects.includes(draft.aspect) ? draft.aspect : aspects[0],
    duration: durations.includes(draft.duration) ? draft.duration : durations[0],
    startImageUrl: draft.kind === "video" ? draft.startImageUrl : null,
    parentId: draft.kind === "video" ? draft.parentId : null,
  };
}

const ASPECT_LABEL: Record<Aspect, string> = { "16:9": "Wide", "9:16": "Tall", "1:1": "Square" };

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  creditsLeft: number | null;
  estimates: Record<string, number>;
  promptRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function Composer({ draft, onChange, onSubmit, submitting, error, creditsLeft, estimates, promptRef }: Props) {
  const set = (patch: Partial<Draft>) => onChange(normalize({ ...draft, ...patch }));
  const preset = presetById(draft.presetId);
  const q = quote({ kind: draft.kind, tier: draft.tier, duration: draft.duration, hasStartImage: Boolean(draft.startImageUrl) });
  const seconds = estimates[q.modelId] ?? q.estimateSeconds;
  const canAfford = creditsLeft === null || creditsLeft >= q.credits;
  const hasInput = draft.prompt.trim().length > 0 || Boolean(draft.startImageUrl);

  return (
    <form
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel lg:max-h-[calc(100dvh-6.5rem)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (hasInput && canAfford && !submitting) onSubmit();
      }}
    >
      <div className="grid grid-cols-2 gap-1 border-b border-line p-1.5" role="radiogroup" aria-label="What to make">
        {(["image", "video"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={draft.kind === kind}
            onClick={() => set({ kind, presetId: kind === draft.kind ? draft.presetId : PRESETS.find((p) => p.kind === kind)!.id })}
            className={`rounded-xl py-2.5 text-[15px] font-semibold transition-colors ${
              draft.kind === kind ? "bg-ink text-panel" : "text-graphite hover:bg-paper"
            }`}
          >
            {kind === "image" ? "Image" : "Video"}
          </button>
        ))}
      </div>

      {/* The settings scroll on their own so the price and Generate stay in view. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <fieldset className="min-w-0 border-b border-line p-4">
        <legend className="sr-only">{draft.kind === "video" ? "Camera move" : "Look"}</legend>
        <p className="mb-2.5 text-sm text-graphite" aria-hidden="true">
          {draft.kind === "video" ? "Camera move" : "Look"}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.filter((p) => p.kind === draft.kind).map((p) => (
            <PresetTile key={p.id} checked={draft.presetId === p.id} onSelect={() => set({ presetId: p.id, aspect: p.aspect ?? draft.aspect })}>
              {p.move && <MoveDiagram move={p.move} className="mb-1 h-7 w-11" />}
              <span className="block text-[15px] font-semibold leading-tight">{p.name}</span>
              <span className="block text-[13px] leading-snug text-graphite">{p.summary}</span>
            </PresetTile>
          ))}
          <PresetTile checked={draft.presetId === null} onSelect={() => set({ presetId: null })}>
            <span className="block text-[15px] font-semibold leading-tight">No preset</span>
            <span className="block text-[13px] leading-snug text-graphite">Your words only</span>
          </PresetTile>
        </div>
      </fieldset>

      <div className="border-b border-line p-4">
        <label htmlFor="prompt" className="mb-2 block text-sm text-graphite">
          {draft.kind === "video" ? "What's in the shot" : "What's in the picture"}
        </label>
        <textarea
          id="prompt"
          ref={promptRef}
          value={draft.prompt}
          onChange={(event) => set({ prompt: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
          }}
          rows={3}
          maxLength={1200}
          placeholder={preset?.placeholder ?? "Describe the subject, the place and the light"}
          className="w-full resize-y rounded-xl border border-line bg-white/70 px-3 py-2.5 text-[15px] leading-relaxed placeholder:text-graphite/70 focus:border-ink focus:outline-none"
        />
        {draft.kind === "video" && <StartImage url={draft.startImageUrl} onChange={(startImageUrl) => set({ startImageUrl, parentId: null })} />}
      </div>

      <fieldset className="min-w-0 border-b border-line p-4">
        <legend className="sr-only">Quality</legend>
        <p className="mb-2.5 text-sm text-graphite" aria-hidden="true">
          Quality
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TIERS.map((tier) => {
            const tierQuote = quote({ kind: draft.kind, tier, duration: draft.duration, hasStartImage: Boolean(draft.startImageUrl) });
            const checked = draft.tier === tier;
            return (
              <label
                key={tier}
                className={`cursor-pointer rounded-xl border px-2.5 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                  checked ? "border-ink bg-white" : "border-line/70 hover:border-graphite/50"
                }`}
              >
                <input type="radio" name="tier" className="sr-only" checked={checked} onChange={() => set({ tier })} />
                <span className="block text-[15px] font-semibold">{TIER_COPY[tier].label}</span>
                <span className="block text-[13px] tabular-nums text-graphite">{plural(tierQuote.credits, "credit")}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] leading-snug text-graphite">
          {TIER_COPY[draft.tier].hint[draft.kind]} Made with {q.modelName}.
        </p>
      </fieldset>

      <div className="flex flex-wrap gap-x-6 gap-y-3 p-4">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm text-graphite">Shape</legend>
          <div className="flex gap-1.5">
            {aspectsFor(draft.kind, draft.tier).map((aspect) => (
              <Segment key={aspect} name="aspect" checked={draft.aspect === aspect} onSelect={() => set({ aspect })}>
                <AspectGlyph aspect={aspect} />
                {ASPECT_LABEL[aspect]}
              </Segment>
            ))}
          </div>
        </fieldset>
        {draft.kind === "video" && (
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm text-graphite">Length</legend>
            <div className="flex gap-1.5">
              {durationsFor(draft.tier).map((duration) => (
                <Segment key={duration} name="duration" checked={draft.duration === duration} onSelect={() => set({ duration })}>
                  {duration} s
                </Segment>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      </div>

      <div className="border-t border-line p-4">
        <p className="mb-3 flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span>
            <span className="text-base font-bold">{plural(q.credits, "credit")}</span> <span className="text-graphite">({usd(q.costUsd)})</span>
          </span>
          <span className="text-graphite">ready in about {formatSeconds(seconds)}</span>
        </p>
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-tally-wash px-3 py-2 text-sm text-tally-deep">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!hasInput || !canAfford || submitting}
          className="w-full rounded-xl bg-tally py-3.5 text-base font-semibold text-white transition-colors hover:bg-tally-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-graphite"
        >
          {submitting ? "Starting…" : draft.kind === "video" ? "Generate video" : "Generate image"}
        </button>
        <p className="mt-2 text-center text-[13px] text-graphite" aria-live="polite">
          {!hasInput
            ? "Describe the shot to continue."
            : !canAfford
              ? `You have ${plural(creditsLeft ?? 0, "credit")} left today. Pick a cheaper quality or a shorter length.`
              : creditsLeft !== null
                ? `${plural(creditsLeft, "credit")} left today. Failed takes are refunded.`
                : "Failed takes are refunded."}
        </p>
      </div>
    </form>
  );
}

function PresetTile({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`relative cursor-pointer rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
        checked ? "border-ink bg-white" : "border-line/70 hover:border-graphite/50"
      }`}
    >
      <input type="radio" name="preset" className="sr-only" checked={checked} onChange={onSelect} />
      {children}
    </label>
  );
}

function Segment({ name, checked, onSelect, children }: { name: string; checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
        checked ? "border-ink bg-white font-semibold" : "border-line text-graphite hover:border-graphite/50"
      }`}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} />
      {children}
    </label>
  );
}

function AspectGlyph({ aspect }: { aspect: Aspect }) {
  const [w, h] = aspect === "16:9" ? [14, 8] : aspect === "9:16" ? [8, 14] : [11, 11];
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <rect x={(16 - w) / 2} y={(16 - h) / 2} width={w} height={h} rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function StartImage({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setUploading(false);
    if (!response?.ok) return setError(data?.error ?? "The image couldn't be uploaded. Try again.");
    onChange(data.url);
  }

  if (url) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-white/70 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Start frame" className="h-14 w-14 rounded-lg object-cover" />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Starts from this image</p>
          <p className="text-graphite">It becomes the first frame.</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded-lg px-2.5 py-1.5 text-sm text-graphite hover:bg-paper hover:text-ink">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      className="mt-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) upload(file);
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        id="start-image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      <label
        htmlFor="start-image"
        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm hover:border-graphite/60"
      >
        <span>
          <span className="font-semibold">{uploading ? "Uploading…" : "Add a start image"}</span>
          <span className="block text-[13px] text-graphite">Optional. JPG, PNG or WebP under 4 MB, or drop it here.</span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-[13px] text-tally-deep">
          {error}
        </p>
      )}
    </div>
  );
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function usd(value: number) {
  return value < 0.1 ? `$${value.toFixed(3).replace(/0$/, "")}` : `$${value.toFixed(2)}`;
}

export function formatSeconds(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}
