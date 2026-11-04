# Take One: design

**What this is:** a rebuild of the job higgsfield.ai does, which is turning an idea into an AI image or video. It's for the 8x assignment and is judged on speed, product judgement and UX. The research behind it is in [`research/product-map.md`](../research/product-map.md).

**Who decided what:** Matej handed the product and technical decisions to the agent ("sve radi kako kažeš"), so every decision below is the agent's call, written down so it can be challenged.

## 1. Thesis

Higgsfield's best idea is **presets**. "Pick a look, add your image, get a video" removes the hardest part, which is knowing what to write. Around that idea the walkthrough found:

- **Choice overload:** about 20 nav items, and menus that mix 15+ tools with 15+ model brand names.
- **A price you can't read:** shown only in credits. A 5 s video costs 80 credits, about €3.20, and that's never stated.
- **Upselling on every screen,** plus "sign up and generate for free" leading to a 0-credit plan.
- **Three different composers** for the same job.
- **Unlabeled icon actions** on results.

**Take One is the core loop done clearly:**

> pick a preset → describe it (optionally start from an image) → see the real price and wait time → generate → keep working while it renders → take the result further in one click (animate it, remix it, download it)

## 2. Goals, non-goals, anti-goals

**Goals**
1. A first-time visitor makes something within 30 seconds of landing. No sign-up wall; the brief needs the live link to work for anyone.
2. One composer for image and video. Presets come first. Models are chosen by intent (Draft / Standard / Cinematic), not by brand.
3. An honest price before every generation: credits *and* dollars, derived from the model's real cost. Also an honest wait estimate.
4. Async work that feels good: queue several jobs, watch progress, keep working, results land in your history.
5. Results lead somewhere: **Animate** (image → video with that frame), **Remix** (reload the preset, prompt and settings), **Download**.

**Non-goals (deliberately left out)**
- Accounts and sign-in. An anonymous visitor ID in a cookie owns the history.
- Payments, plans and upsells.
- The social layer: profiles, followers, blogs, ratings, contests.
- Side products: Mangaka, Playable, Supercomputer, MCP, plugins, Academy, team/enterprise.
- Most of the 46 apps. One generalisable pattern (preset = template on the shared pipeline) replaces them.
- Video-to-video features: Genjutsu-style motion transfer, editing, extension.

**Anti-goals (failure even if it works)**
- Looking or reading like a Higgsfield copy. Take One has its own name, layout and visual identity, and avoids their black and acid-lime look.
- A price that surprises the user after the click.
- A public link that lets strangers burn unlimited money.

## 3. Constraints

- **Time:** 24 h budget, and speed is scored. Deploy early and keep the live link working.
- **Public demo with real spend:**
  - each visitor gets a daily credit allowance
  - a per-IP daily cap blunts cookie clearing
  - a hard **AI Gateway budget** caps total spend for the project
  - when the cap is hit, the UI says so plainly
- **Slow video:** generation takes 30 s to several minutes. Function timeouts mean the work can't sit inside one request.

## 4. Approaches considered

**Generation backend**

| Option | Trade-off | Verdict |
| :- | :- | :- |
| **Vercel AI Gateway** | One auth via OIDC on Vercel, with no extra account or key. The live catalog (`/v1/models`) carries each model's real price, which powers the honest-price goal. Budgets give a hard spend cap. It has an async job API (`experimental_startVideo` / `experimental_getVideoStatus`). Covers 37 image and 39 video models, including Seedance, Veo, Kling, Wan and FLUX. The downside: the video API is marked experimental. | **Chosen** |
| fal.ai | Large catalog and a mature queue API. But it needs a separate account, key and billing, has no built-in budget, and prices would have to be maintained by hand. | Rejected |
| Mocked generation (pre-rendered samples) | Zero cost and zero risk, but the brief asks for working product. | Rejected as the main path. Used only for preset preview thumbnails, which are generated once with the real pipeline. |

**State**

| Option | Trade-off | Verdict |
| :- | :- | :- |
| **Upstash Redis + Vercel Blob** | Key-value fits the job records, per-visitor credits and counters. Blob keeps media permanently, since provider URLs expire. Both are provisioned from the Vercel Marketplace. | **Chosen** |
| Postgres (Neon) | Relational power we don't need, and it adds schema and migrations. | Rejected |
| Client-only (localStorage) | No server state, so no quotas and no shared Explore page. | Rejected |

## 5. Decisions

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind, and AI SDK 7 (`ai`) through AI Gateway with plain `provider/model` strings. Hosted on Vercel.

**Credits:** 1 credit = $0.01 of real model cost, rounded up. A visitor gets **150 credits per day**. The AI Gateway project budget is **$25 per month**, as a hard stop.

**Model lineup:** chosen by intent and verified against the live catalog at build time.

| Intent | Image | Video |
| :- | :- | :- |
| Draft (fast, cheapest) | Grok Imagine (2¢, ~7 s) | Seedance 1.0 Pro Fast, 480p (≈5¢ per 5 s) |
| Standard | Seedream 5.0 Pro, no watermark (≈4¢, ~45 s) | Kling 2.5 Turbo (≈21¢ per 5 s) |
| Cinematic | FLUX 1.1 Pro Ultra (6¢, ~8 s) | Veo 3.1 Fast with audio (≈60¢ per 4 s) |

*Revised after the first live tests (2026-11-04):*
- **FLUX 3 dropped.** The image lineup was first FLUX 3 Klein, Seedream 5.0 Pro and FLUX 3. The gateway's free tier refuses both FLUX 3 models, and the replacements work with or without paid credit.
- **Shape checked by pixels.** Every candidate was checked by measuring the pixel size it returned. FLUX 1.1 Pro and FLUX 2 Klein were rejected because they return 4:3 or square images when asked for 16:9, and give no warning.
- **Seedream takes a size.** It ignores `aspectRatio`, so it is sent an exact `size` for each shape.
- **Video needs paid credit.** The gateway requires a paid balance of at least $10 before it accepts a video job.

**Presets:** a preset is a prompt template plus default settings plus a preview. The first set:
- **video:** camera moves such as dolly in, orbit, crane up, FPV fly-through, handheld, product spin and timelapse
- **image:** looks such as cinematic still, product shot, editorial portrait, anime, analog film and 3D render
- **"No preset"** for full manual control

**Async jobs:** every generation is a job: `queued → running → succeeded | failed`.
- `POST /api/jobs` validates the request, prices it, reserves credits, records the job and returns at once.
- Images: generated inside `after()`.
- Video: started with `startVideo`, and the serialised operation is stored. `GET /api/jobs` refreshes running video jobs with `getVideoStatus`.
- On completion, media is copied to Blob.
- On failure, credits are refunded.
- Wait estimates come from a rolling average of real durations per model, with sensible defaults before data exists.

**Screens:**
1. **Create** (`/`): the composer (mode, preset rail, prompt, optional start image, intent, aspect, duration, price and wait line, Generate) above your history grid with live job states.
2. **Result viewer** (modal): media, prompt, settings, cost and time. Actions: Animate, Remix, Download, Publish to Explore.
3. **Explore** (`/explore`): published results, each with Remix.

## 6. Build order (deploy after every milestone)

1. **M0:** scaffold, own visual identity, deploy a skeleton. The live link exists from the start.
2. **M1:** image generation end to end. Covers the visitor cookie, credits, Redis, Blob and the history grid.
3. **M2:** async video, plus Animate (image → video).
4. **M3:** presets with previews, and the price and wait line.
5. **M4:** result viewer actions, Explore and Remix.
6. **M5:** empty and error states (insufficient credits, budget exhausted, provider failure), mobile, and a README with the walkthrough script.

## 7. Left to the builder

Exact model IDs and parameters (verified against `/v1/models` and the installed `ai` package docs), preset copy, the visual design details, and wait-time defaults.
