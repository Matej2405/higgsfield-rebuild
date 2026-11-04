# Higgsfield: product map

**Sources:**
- higgsfield.ai, `/apps` and `/pricing`, fetched 2026-11-04.
- A hands-on walkthrough by Matej on 2026-11-04. Screenshots are in [`screenshots/`](screenshots/) and cited below as (01)–(09).

**Status:** Sign-up, both generators and pricing have been seen hands-on. Still open: the waiting state, the result detail view, history, community and one app (see §4).

## 1. What it is

Higgsfield is a creative studio that aggregates AI image and video generation. It has four layers:

1. **Generators**
   - Image: `/ai/image`, led by Higgsfield Soul.
   - Video: `/ai/video`, led by Seedance 2.5.
   - The model picker covers "30+ models", including:
     - Higgsfield's own: Soul, Cinema Studio, Genjutsu, Intone.
     - Third-party: Seedance, Kling, Veo, Sora, Nano Banana, GPT Image, FLUX, Wan, Grok Imagine and others (04, 06).
2. **Apps** (`/apps`): about 46 one-click templates. Each takes a fixed input, usually a photo or a video, and runs a fixed transformation, for example: Face Swap, Relight, Expand image, Angles, Shots (1 image → 9 shots), Click to Ad and meme templates. They come in 8 categories, with Pro, New and Trending badges. The catalog has no search or filters.
3. **Community:** public projects and a "Community trending / Community new" motion library inside the generators (08).
4. **Monetisation:** credits and subscriptions (09).

Around these sit many side products: Shorts, Mangaka, Playable, Content Factory, Supercomputer Agent, MCP for Claude, a ChatGPT Plugin, AI Influencer, Katana, Academy, Ads Studio and a film festival (01).

## 2. Core loop

```
choose what to make (model or preset) → give input (prompt and/or reference upload)
  → see the cost (on the Generate button) → generate (async)
  → result lands in the grid/history → download / iterate
```

The video page teaches the loop itself: "Make videos in one click": **Add image → Choose preset → Get video**, with "250+ presets for camera control, framing, and high-quality VFX" (07). Presets are where the real value is. They turn "what do I write?" into "pick a look".

## 3. Observed in the walkthrough

**Navigation overload**
- There are about 20 top-level nav items, and they overflow the bar (01).
- The Image menu has 12 features and 15 models (04). The Video menu has 15+ features and 15+ models, and it scrolls (06).
- Features ("Relight", "Canvas", "Click to Ad") and models ("Kling 4.0", "Wan 3.0", "MiniMax H3") sit side by side. To choose, a user has to already know what each model name means.

**"Generate for free" isn't free**
- The sign-up modal promises "Sign up and generate for free" (02).
- The very next screen is an upsell comparing Free, €10 Lite and Starter, and Free has **0 credits**. It says outright: "Free can't top up, gates premium models, gives Soul in preview only" (03).
- What a free account actually gets is a handful of tool-specific free generations, for example Genjutsu "Use free generations · 1 left" (08).

**Upsell on every screen**
- a discount banner and "Pricing −55%" in the nav (01, 03)
- the post-signup modal (03)
- a popup on the video page (07)
- a "Credits are running low! All credits used · Upgrade" toast (09)

**Cost is visible, but only in credits**
- The Generate button shows the price before you click:
  - an image costs 6.5 credits, discounted from 8.5 (05)
  - a 5 s, 1080p Seedance 2.5 video costs **80 credits** (07)
- The price is never shown in money. By the pricing page, 250 credits = €10, so that one video costs about **€3.20**.
- The price changes with the settings (model, duration, quality, bitrate), but nothing says which setting drives it.

**Pricing has three currencies** (09)
- Plans:
  - Lite: €10/mo for 250 credits
  - Starter: €19 for 270 credits
  - Plus: €35 for 1,200 credits
  - Ultra: €70 for 3,000 credits
- Credits are translated into "≈125 Nano Banana Pro generations" or "≈17 Seedance 2.5 videos", which is helpful.
- On top of credits, each plan has separate "Free generations" per tool and "Unlimited & free gens" per model, with their own resolution caps. Understanding what you can actually make means reading a matrix.

**The same job has three different composers**
- Image: a prompt bar at the bottom with chips (`+` upload, `@` reference, model, aspect "Auto", quality "High", "2K", count "1/4") above the result grid (05).
- Video: a form on the left (preset card, references, prompt with `@ Elements`, audio toggle, model, duration, aspect, quality, bitrate), with results under a "History" tab (07).
- Genjutsu: a third variant (motion transfer / objects swap, style, reference video, characters, prompt toggle) (08).

## 4. Hands-on walkthrough checklist (Matej)

- [x] Sign-up/onboarding (02, 03)
- [x] Image generator: controls, model menu, cost before generating (04, 05)
- [x] Video generator: controls, presets, cost (06, 07, 08)
- [x] Pricing (09)
- [ ] What waiting looks like while a video generates (the 1 free Genjutsu generation could show this)
- [ ] Clicking a generated result: what you can do with it (download, upscale, animate, reuse prompt?)
- [ ] History/library: the folder icon in the nav, or the "History" tab
- [ ] Explore/community: a project page
- [ ] Anything that confused or annoyed you, with the screenshot number

## 5. Scope thinking (draft, to be decided once §4 is complete)

The judging criteria are speed, product judgement (what's first, what's left out) and UX. The walkthrough makes the opportunity concrete: Higgsfield's strongest idea is preset-driven generation. Its weakest points are choice overload, an unclear price and constant upselling. Our rebuild should be the core loop done clearly.

**Likely in:**
- **One composer** for both image and video, with presets first. Model choice comes second and is described by intent (fast / best quality / cheapest), not by brand name.
- **An honest price before generating:** credits *and* money, plus what drives the cost.
- **Async generation done well:** visible progress, keep working meanwhile, results appear in a history.
- **A visitor can try it without signing up,** with a few demo credits. The brief requires the live link to work signed-out.
- **A small curated set of templates** on the same pipeline.

**Likely out:** side products (Mangaka, Playable, Supercomputer, MCP, plugins, contests, Academy, team/enterprise), real payments and most of the 46 apps.

**Open decision:** a real generation backend, which needs an API provider and a spend cap.
