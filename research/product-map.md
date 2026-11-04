# Higgsfield: product map

**Sources:** higgsfield.ai, `/apps` and `/pricing`, fetched 2026-11-04.
**Status:** first pass. The generator pages (`/ai/image`, `/ai/video`) and `/pricing` render client-side, so their real UI and prices still need the hands-on walkthrough (§4).

## 1. What it is

Higgsfield is a creative studio that aggregates AI image and video generation. It has four layers:

1. **Generators**
   - Image: `/ai/image`, led by Higgsfield Soul Cinema.
   - Video: `/ai/video`, led by Seedance 2.5 and Cinema Studio 4.0 (`cinematic-v4`).
   - The model picker covers "30+ models", including:
     - Higgsfield's own: Soul, Cinema Studio, Genjutsu.
     - Third-party: Seedance, Kling 3.0, Veo 3.1, Sora 2, Ideogram Vector.
2. **Apps** (`/apps`): about 46 one-click templates. Each takes a fixed input, usually a photo or a video, and runs a fixed transformation, for example: Face Swap, Relight, Expand image, Angles, Shots (1 image → 9 shots), Transitions, Click to Ad (product link → video ad), Bullet Time, and meme templates. They come in 8 categories, with Pro, New and Trending badges. The catalog has no search or filters.
3. **Community** (`/community`): public projects that show prompt, assets and steps, so you can learn from other people's work and reuse it.
4. **Monetisation:** credits and subscriptions (`/pricing`, `/team-plan`, `/enterprise`). The hero offers "Get unlimited top models" and a sign-up discount.

Around these sit many side products: Shorts, Genjutsu (video recasting), Mangaka (comics), Playable (games from a prompt), Content Factory, Supercomputer Agent, an MCP server for Claude, AI Influencer studio, Academy and a film festival.

## 2. Core loop (hypothesis, to confirm in §4)

```
choose what to make (model or app) → give input (prompt and/or upload)
  → see the cost → generate (async, from seconds to minutes)
  → result lands in a history/library → download / iterate / remix
```

Everything else feeds this loop or monetises it. Templates lower the "what should I prompt?" barrier. The community feed supplies ideas. Credits gate the "generate" step.

## 3. Where it looks weak (hypotheses, to confirm or reject in §4)

- **Breadth over clarity.** Dozens of products, 30+ models and about 46 apps. The first-time question "what do I click to make X?" has no single answer.
- **App discovery.** 46 apps with no search or filter, and badges ("Pro") that aren't explained on the page.
- **Cost opacity.** The public pages give no per-generation price. Check whether the generator shows the credit cost *before* you click generate.
- **Async waiting.** Video takes minutes. Check what the UI does in the meantime: progress, queue, notifications, whether you can keep working.

## 4. Hands-on walkthrough checklist (Matej)

Save screenshots as `research/screenshots/NN-short-name.png`.

- [ ] Sign-up/onboarding: steps, what's asked, where you land, free credits.
- [ ] Image generator: every control, the model picker, the cost shown before generating, the result view.
- [ ] Video generator: start/end frame, duration, aspect, camera/motion presets, audio, cost, what waiting looks like.
- [ ] One app end to end, e.g. Relight or Face Swap: input → result.
- [ ] History/library: how past generations are organised, filter, re-run, download.
- [ ] Community: a project page, and whether you can "use this prompt".
- [ ] Pricing page: plans, credits per plan, credits per generation per model.
- [ ] Anything that was confusing, slow, or pushed you toward paying. Note it with the screenshot number.

## 5. Scope thinking (draft, decided after §4)

The judging criteria are speed, product judgement (what's first, what's left out) and UX. Rebuilding 30 models and 46 apps would be the wrong goal. Our edge is making the core loop in §2 excellent.

**Likely in:**
- one create flow for image and video
- a small curated set of templates on the same pipeline
- a cost shown before generating
- a good async/history experience
- a visitor can try it without signing up, because the brief requires the live link to work signed-out

**Likely out:** side products (Mangaka, Playable, Supercomputer, MCP, contests, Academy, team/enterprise), real payments, and most of the 46 apps.

**Open decision:** a real generation backend, which needs an API provider and a spend cap.
