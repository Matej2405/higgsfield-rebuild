"use client";

import { presetById } from "@/lib/presets";
import type { Take } from "@/lib/take";
import { formatSeconds } from "./composer";

type Props = {
  takes: Take[] | null;
  loadError: string | null;
  now: number;
  onOpen: (take: Take) => void;
  onAnimate: (take: Take) => void;
  onRemix: (take: Take) => void;
};

export function Takes({ takes, loadError, now, onOpen, onAnimate, onRemix }: Props) {
  return (
    <section aria-labelledby="takes-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="takes-heading" className="text-xl font-extrabold [font-stretch:125%]">
          Takes
        </h2>
        {takes && takes.length > 0 && <p className="text-sm text-graphite tabular-nums">{takes.length} so far</p>}
      </div>

      {loadError && (
        <p role="alert" className="mb-3 rounded-lg bg-tally-wash px-3 py-2 text-sm text-tally-deep">
          {loadError}
        </p>
      )}

      {takes === null ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-graphite">Loading your takes…</p>
      ) : takes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-lg font-semibold">Your takes land here.</p>
          <p className="mx-auto mt-1 max-w-sm text-graphite">
            Pick a look, describe the picture and generate. A Draft image costs one credit and is ready in seconds.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {takes.map((take) => (
            <li key={take.id}>
              <TakeCard take={take} now={now} onOpen={onOpen} onAnimate={onAnimate} onRemix={onRemix} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TakeCard({ take, now, onOpen, onAnimate, onRemix }: { take: Take; now: number; onOpen: Props["onOpen"]; onAnimate: Props["onAnimate"]; onRemix: Props["onRemix"] }) {
  const preset = presetById(take.presetId);
  const done = take.status === "succeeded" && take.output;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-sm">
        <span className="font-bold tabular-nums">Take {take.take}</span>
        <span className="truncate text-graphite">
          {take.kind === "video" ? `${take.duration} s video` : "Image"}
          {preset ? `, ${preset.name}` : ""}
        </span>
      </header>

      <div className="relative bg-ink/5" style={{ aspectRatio: take.aspect.replace(":", " / ") }}>
        {done ? (
          <button type="button" onClick={() => onOpen(take)} className="block h-full w-full" aria-label={`Open take ${take.take}`}>
            {take.kind === "video" ? (
              <video
                src={take.output!.url}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                onMouseEnter={(event) => event.currentTarget.play().catch(() => {})}
                onMouseLeave={(event) => event.currentTarget.pause()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={take.output!.url} alt={take.prompt} className="h-full w-full object-cover" />
            )}
          </button>
        ) : take.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
            <p className="text-sm font-semibold">This take didn&apos;t come out.</p>
            <p className="text-[13px] text-graphite">{take.error}</p>
            <p className="text-[13px] text-graphite">{take.credits} credits returned.</p>
          </div>
        ) : (
          <Rolling take={take} now={now} />
        )}
      </div>

      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <p className="line-clamp-2 text-sm leading-snug">{take.prompt || "From a start image"}</p>
        <div className="flex shrink-0 gap-1">
          {done && take.kind === "image" && (
            <button type="button" onClick={() => onAnimate(take)} className="rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-semibold text-panel hover:bg-ink/85">
              Animate
            </button>
          )}
          {(done || take.status === "failed") && (
            <button type="button" onClick={() => onRemix(take)} className="rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-semibold hover:border-ink">
              {take.status === "failed" ? "Try again" : "Remix"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Rolling({ take, now }: { take: Take; now: number }) {
  const elapsed = Math.max(0, (now - (take.startedAt ?? take.createdAt)) / 1000);
  const progress = take.status === "queued" ? 0.04 : Math.min(0.95, elapsed / take.estimateSeconds);
  const late = elapsed > take.estimateSeconds * 1.2;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4" role="status">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="tally-pulse h-2.5 w-2.5 rounded-full bg-tally" aria-hidden="true" />
        {take.status === "queued" ? "Starting" : "Rolling"}
      </p>
      <div className="h-1 w-2/3 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full rounded-full bg-tally transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="text-[13px] tabular-nums text-graphite">
        {formatSeconds(elapsed)} of about {formatSeconds(take.estimateSeconds)}
        {late ? ". Taking longer than usual." : ""}
      </p>
    </div>
  );
}
