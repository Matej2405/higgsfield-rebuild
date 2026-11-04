"use client";

import { useEffect, useRef } from "react";
import { TIER_COPY } from "@/lib/catalog";
import { presetById } from "@/lib/presets";
import type { Take } from "@/lib/take";
import { formatSeconds, plural, usd } from "./composer";

type Props = {
  take: Take | null;
  title: string;
  onClose: () => void;
  onAnimate: (take: Take) => void;
  onRemix: (take: Take) => void;
};

export function Viewer({ take, title, onClose, onAnimate, onRemix }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (take && !dialog.current?.open) dialog.current?.showModal();
    if (!take && dialog.current?.open) dialog.current.close();
  }, [take]);

  const preset = presetById(take?.presetId);
  const took = take?.finishedAt && take.startedAt ? (take.finishedAt - take.startedAt) / 1000 : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto w-[min(1100px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border border-line bg-panel p-0 text-ink backdrop:bg-ink/60"
    >
      {take?.output && (
        <div className="grid max-h-[calc(100dvh-2rem)] md:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 items-center justify-center bg-ink">
            {take.kind === "video" ? (
              <video src={take.output.url} controls autoPlay loop playsInline className="max-h-[calc(100dvh-2rem)] w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={take.output.url} alt={take.prompt} className="max-h-[calc(100dvh-2rem)] w-full object-contain" />
            )}
          </div>

          <div className="flex min-h-0 flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-lg font-extrabold [font-stretch:125%]">{title}</h2>
              <button type="button" onClick={onClose} className="rounded-lg px-2.5 py-1.5 text-sm text-graphite hover:bg-paper hover:text-ink">
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4 px-4 py-4 text-sm">
              <p className="text-[15px] leading-relaxed">{take.prompt || "Animated from a start image"}</p>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-graphite">{take.kind === "video" ? "Camera move" : "Look"}</dt>
                <dd>{preset?.name ?? "None"}</dd>
                <dt className="text-graphite">Quality</dt>
                <dd>
                  {TIER_COPY[take.tier].label}, {take.modelName}
                </dd>
                <dt className="text-graphite">Shape</dt>
                <dd>
                  {take.aspect}
                  {take.duration ? `, ${take.duration} s` : ""}
                </dd>
                <dt className="text-graphite">Cost</dt>
                <dd className="tabular-nums">
                  {plural(take.credits, "credit")} ({usd(take.costUsd)})
                </dd>
                {took && (
                  <>
                    <dt className="text-graphite">Took</dt>
                    <dd className="tabular-nums">{formatSeconds(took)}</dd>
                  </>
                )}
              </dl>

              <details className="rounded-xl border border-line px-3 py-2">
                <summary className="cursor-pointer text-graphite">Exact prompt sent to the model</summary>
                <p className="mt-2 leading-relaxed">{take.finalPrompt}</p>
              </details>

              {take.startImageUrl && (
                <div>
                  <p className="mb-1.5 text-graphite">Started from</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={take.startImageUrl} alt="Start frame" className="h-20 rounded-lg border border-line object-cover" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
              {take.kind === "image" && (
                <button type="button" onClick={() => onAnimate(take)} className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-panel hover:bg-ink/85">
                  Animate this image
                </button>
              )}
              <button type="button" onClick={() => onRemix(take)} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:border-ink">
                Remix
              </button>
              <a
                href={`${take.output.url}?download=1`}
                className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:border-ink"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
