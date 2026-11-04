"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CreditsState } from "@/lib/server/credits";
import type { Take } from "@/lib/take";
import { Composer, normalize, plural, type Draft } from "./composer";
import { Takes } from "./takes";
import { Viewer } from "./viewer";

type StudioState = { takes: Take[]; credits: CreditsState; estimates: Record<string, number> } | { error: string };

async function fetchState(): Promise<StudioState> {
  const response = await fetch("/api/takes", { cache: "no-store" }).catch(() => null);
  const data = await response?.json().catch(() => null);
  if (!response?.ok || !data) return { error: data?.error ?? "Your takes couldn't be loaded. Check your connection and refresh." };
  return data;
}

const INITIAL_DRAFT: Draft = normalize({
  kind: "image",
  presetId: "film-still",
  prompt: "",
  tier: "draft",
  aspect: "16:9",
  duration: 5,
  startImageUrl: null,
  parentId: null,
});

export function Studio() {
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Take | null>(null);
  // 0 until data arrives: reading the clock during render would freeze it into the prerendered shell.
  const [now, setNow] = useState(0);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const active = takes?.some((t) => t.status === "queued" || t.status === "running") ?? false;

  const apply = useCallback((state: StudioState) => {
    if ("error" in state) {
      setTakes((current) => current ?? []);
      setError(state.error);
      return;
    }
    setNow(Date.now());
    setTakes(state.takes);
    setCredits(state.credits);
    setEstimates(state.estimates);
  }, []);

  useEffect(() => {
    let live = true;
    fetchState().then((state) => live && apply(state));
    return () => {
      live = false;
    };
  }, [apply]);

  // While anything is rolling: tick the timers every second and ask for news every 3 s.
  useEffect(() => {
    if (!active) return;
    let live = true;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => fetchState().then((state) => live && apply(state)), 3000);
    return () => {
      live = false;
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [active, apply]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/takes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: draft.kind,
        tier: draft.tier,
        presetId: draft.presetId,
        prompt: draft.prompt,
        aspect: draft.aspect,
        duration: draft.kind === "video" ? draft.duration : null,
        startImageUrl: draft.startImageUrl,
        parentId: draft.parentId,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setSubmitting(false);
    if (!response?.ok) {
      setError(data?.error ?? "The take couldn't be started. Check your connection and try again.");
      return;
    }
    setNow(Date.now());
    setTakes((current) => [data.take, ...(current ?? [])]);
    setCredits(data.credits);
  }

  function focusComposer() {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    promptRef.current?.focus({ preventScroll: true });
  }

  function animate(take: Take) {
    if (!take.output) return;
    setViewing(null);
    setError(null);
    setDraft((current) =>
      normalize({
        ...current,
        kind: "video",
        presetId: current.kind === "video" && current.presetId ? current.presetId : "push-in",
        prompt: take.prompt,
        aspect: take.aspect,
        startImageUrl: take.output!.url,
        parentId: take.id,
      }),
    );
    focusComposer();
  }

  function remix(take: Take) {
    setViewing(null);
    setError(null);
    setDraft(
      normalize({
        kind: take.kind,
        presetId: take.presetId,
        prompt: take.prompt,
        tier: take.tier,
        aspect: take.aspect,
        duration: take.duration ?? 5,
        startImageUrl: take.startImageUrl,
        parentId: take.parentId,
      }),
    );
    focusComposer();
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="text-[22px] font-black leading-none tracking-tight [font-stretch:125%]">Take One</p>
          {credits && <CreditsMeter credits={credits} />}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[400px_1fr] lg:items-start">
        <div ref={composerRef} className="scroll-mt-20 lg:sticky lg:top-20">
          <Composer
            draft={draft}
            onChange={setDraft}
            onSubmit={submit}
            submitting={submitting}
            error={error}
            creditsLeft={credits?.remaining ?? null}
            estimates={estimates}
            promptRef={promptRef}
          />
        </div>
        <Takes takes={takes} now={now} onOpen={setViewing} onAnimate={animate} onRemix={remix} />
      </main>

      <Viewer take={viewing} onClose={() => setViewing(null)} onAnimate={animate} onRemix={remix} />
    </>
  );
}

function CreditsMeter({ credits }: { credits: CreditsState }) {
  const share = credits.allowance ? credits.remaining / credits.allowance : 0;
  return (
    <div className="flex items-center gap-3 text-sm" title={`Your allowance refills at ${new Date(credits.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}>
      <span className="tabular-nums">
        <span className="font-semibold">{plural(credits.remaining, "credit")}</span>
        <span className="hidden text-graphite sm:inline"> left today</span>
      </span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${share * 100}%` }} />
      </span>
    </div>
  );
}
