# Take One

**Live:** https://take-one-alpha.vercel.app. No sign-up needed; every visitor gets 150 free credits a day.

Take One does the job of higgsfield.ai: you describe a shot and get an AI image or video. It is not a copy of Higgsfield. It keeps Higgsfield's best idea, presets, and cuts most of the rest.

- **Pick a preset.** It is a look for images, or a camera move for video.
- **Describe the shot.**
- **See what it costs and how long it takes**, before you click.
- **Generate.** Several takes can render at once while you keep working.
- **Take the result further:** Animate a still into a video, Remix any take, or download it.

## Why it looks like this

I went through Higgsfield hands-on before building. The full notes, with numbered screenshots, are in [research/product-map.md](research/product-map.md). This is what I saw, and how Take One answers it:

| Seen on Higgsfield | Take One |
| :- | :- |
| About 20 nav items. The Image and Video menus each mix 12–15 tools with 15+ model brand names, so choosing means already knowing what "Kling" or "Wan" is. | Pick by intent: **Draft, Standard or Cinematic**. The model behind each one is named, but you never need to know it. |
| Prices are in credits only. A 5-second video costs 80 credits, which is about €3.20, but no screen says so. The price changes with the settings, and nothing says which setting moved it. | **Credits and dollars before every take.** One credit is one cent of the real model cost, so the price you see is the price paid. |
| Three different composers: image, video and Genjutsu. | **One composer** for image and video. |
| Result actions are unlabelled icons. | **Labelled actions:** Animate, Remix, Download. |
| A sign-up wall, then a plan with 0 credits, and upsells in the nav and right after sign-up. | **No account and no upsell.** The link works for anyone. |

Also new in Take One:
- **Wait estimates** come from real runs of each model, and each take shows a progress bar against its estimate.
- **Failed takes are refunded** automatically, and the card says so.
- **Every preset shows a frame from a real take made with it.**
- **Every result shows the exact prompt** that was sent to the model.

## What was built, in order

The commit history follows this order; see `git log`.

1. **Agent capture first,** before any code, as the brief requires. Hooks write every prompt and final response to [`.agent-logs/`](.agent-logs/), and [CAPTURE-TEST.md](CAPTURE-TEST.md) shows it working.
2. **Research and a design doc** before scaffolding: [docs/design.md](docs/design.md). It holds the thesis, goals, non-goals and every decision. Decisions that changed during the build are marked there.
3. **The core loop end to end,** deployed early: composer, async jobs, credits, history, image and video.
4. **Verification against the real models,** not just the code (next section).
5. **Presets with real previews**, then the **"Made with Take One" gallery**, so a first visit shows real output and offers a one-click start.

### Left out on purpose

- **Accounts, payments and plans.** A cookie owns your history, and daily credits cap spending. The live link has to work for someone who isn't signed in.
- **An open Explore feed.** Anyone could post anything to a public page that nobody moderates. The gallery is curated instead, using [`scripts/feature.mjs`](scripts/feature.mjs).
- **Higgsfield's 46 apps and the social layer** (profiles, contests, side products). One pattern replaces the apps: a preset is a template on the shared pipeline.
- **Video-to-video** (motion transfer, editing, extension).

## Verified with real runs

Each model was checked by measuring the files it returned, not by reading status codes. Testing this way caught several problems that would otherwise have shipped:

- **Wrong shapes, no warning.** FLUX 1.1 Pro and FLUX 2 Klein return 4:3 or square images when asked for 16:9. Both were replaced.
- **Seedream ignores `aspectRatio`.** It now gets an exact pixel size per shape, and its default "AI generated" watermark is switched off.
- **Square Draft video failed in production.** Seedance refuses 480×480 and needs 640×640. The failed take was refunded, which proved the refund path works.
- **One preset was broken.** The fly-through text said "FPV drone", and the model put a drone in the shot. It now describes how the camera moves.
- **The credits meter showed stale numbers after a refund,** because it was read in parallel with the update that issued the refund.

Every shipped combination was measured: each tier, each shape, and Animate's first frame against its start image. The one exception is Cinematic tall video, left unmeasured because it costs $0.60 a run.

## Models and prices

| Quality | Image | Video |
| :- | :- | :- |
| Draft | Grok Imagine. 2 credits, about 8 s | Seedance 1.0 Pro Fast, 480p. 5 credits for 5 s, about 30 s |
| Standard | Seedream 5.0 Pro. 4 credits, about 45 s | Kling 2.5 Turbo, 720p. 21 credits for 5 s, about 80 s |
| Cinematic | FLUX 1.1 Pro Ultra. 6 credits, about 8 s | Veo 3.1 Fast, 720p with sound. 60 credits for 4 s, about 80 s |

Prices come from the AI Gateway catalog. Wait times are rolling averages of real runs.

Spending limits:
- **Per visitor:** 150 credits a day.
- **Per IP address:** 300 credits a day.
- **For everyone together:** 800 credits a day.
- **For the whole project:** a hard AI Gateway budget of $25 a month.

## How it works

Next.js 16 on Vercel. Generation runs through the Vercel AI Gateway and the AI SDK: `generateImage` for images, and `experimental_startVideo` / `experimental_getVideoStatus` for video.

```
POST /api/takes ── validate, quote, reserve credits ── save job (Upstash Redis) ── 201
                     └─ after(): image → generate → Blob → done
                                 video → start job at the provider (idempotency key = job id)
GET  /api/takes ── list takes; for running video, ask the provider at most every 4 s
                   (Redis lock) → copy the file to Blob → done, or fail and refund
```

- **Results** are copied into Vercel Blob, so provider URLs expiring doesn't matter.
- **Wait estimates** come from a rolling average of real durations per model.
- **Main files:**
  - jobs: [lib/server/jobs.ts](lib/server/jobs.ts)
  - credits: [lib/server/credits.ts](lib/server/credits.ts)
  - model lineup: [lib/catalog.ts](lib/catalog.ts)
  - presets: [lib/presets.ts](lib/presets.ts)

## Run it locally

You need a linked Vercel project with an Upstash Redis store and a Blob store connected:

```
vercel link
vercel env pull        # KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN, VERCEL_OIDC_TOKEN
npm install
npm run dev
```

`DAILY_VISITOR_CREDITS`, `DAILY_IP_CREDITS` and `DAILY_GLOBAL_CREDITS` override the default limits.

## Repo map

- **App code:** `app/`, `components/`, `lib/`
- **[docs/design.md](docs/design.md):** thesis, scope and decisions, including changes made during the build
- **[docs/walkthrough.md](docs/walkthrough.md):** the script for the walkthrough video
- **[research/](research/):** the Higgsfield walkthrough, with screenshots
- **[scripts/](scripts/):** generates the preset previews and copies takes into the gallery
- **[.agent-logs/](.agent-logs/) and [.claude/](.claude/):** the agent capture hooks and the logs they produced
