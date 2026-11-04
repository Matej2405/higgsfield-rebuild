# Walkthrough script (≤ 5 min, camera on)

Read it once out loud and keep your own words. The timings are targets, not a teleprompter.

## Before recording

- **Fresh visitor:** open https://take-one-alpha.vercel.app in a **private window**. You start with 150 credits and an empty history.
- **Tabs, in order:** `research/screenshots/04-image-menu.png`, then `07-video-generator.png`, then Take One.
- **Prompt to paste:** `A lighthouse keeper climbing a spiral staircase, lantern light, storm outside the window`
- **Hide the dock and notifications.** Camera in a corner.

## 0:00 – Who and what (20 s)

> I'm Matej. This is Take One, my rebuild of what Higgsfield does: you describe a shot, and you get an AI image or video. I didn't copy the interface. I kept the one idea that makes Higgsfield good and cut most of the rest.

## 0:20 – What I saw on Higgsfield (40 s)

*Screen: 04-image-menu, then 07-video-generator.*

> Higgsfield's best idea is presets. You pick a camera move or a look, and you don't have to know what to write. But around that idea:
> - the Image menu mixes twelve tools with fifteen model brand names;
> - prices are only in credits, so this five-second video is 80 credits, which is about three euros twenty, and no screen says that;
> - right after sign-up you hit an upsell, and that's where you find out the free plan has zero credits.
>
> So the plan was: the core loop, done clearly, with an honest price.

## 1:00 – The core loop (1 min 30 s)

*Screen: Take One, private window.*

> No account. It opens straight into the studio, with real examples below.

*Pick the **Film still** look. Paste the prompt.*

> Presets come first. Each tile is a frame from a real take made with that preset. Quality is chosen by intent: Draft, Standard or Cinematic. The model is named, but you don't need to know it. And here's the price, before I click: two credits, two cents, ready in about eight seconds. That estimate comes from real runs, not a guess.

*Click **Generate image**. It lands in about 8 s. Open it.*

> Every result shows what it cost, how long it took, and the exact prompt that was sent to the model.

*Click **Animate this image**.*

> One click turns the still into the first frame of a video, with a camera move already picked.

*Click **Generate video** (Draft, 5 credits, about 30 s). While it renders:*

> Video is asynchronous. I can keep working, start more takes, and each one shows its progress against the estimate. If a take fails, the credits come back automatically. Switching to Cinematic shows sixty credits for four seconds with sound, so the expensive option is never a surprise.

*When the video lands, play it for a second.*

## 2:30 – Product judgement (1 min)

> What I built first: the loop you just saw, deployed early and run against real models.
>
> What I left out on purpose:
> - Accounts and payments. A cookie owns your history, daily credits cap spending, and the link works for anyone.
> - An open community feed. Anonymous visitors could post anything, and there's no moderation. So "Made with Take One" is a curated gallery of real takes, and you can remix any of them.
> - Higgsfield's forty-six apps. One pattern replaces them: a preset is a template on the shared pipeline.

*Scroll to the gallery and click **Remix** on the Marrakech video.*

> Remix loads the preset, prompt and settings, so you start from something that already works.

## 3:30 – How I know it works (50 s)

*Screen: README, "Verified with real runs".*

> I didn't trust status codes. I measured every file the models returned. That caught things that would have shipped:
> - Two image models silently returned the wrong shape, so they were replaced.
> - Square Draft video failed in production. The take was refunded, which proved the refund path works, and the fix was one size.
> - One preset said "FPV drone", and the model put a drone in the shot.
>
> Every prompt I gave the agent is in `.agent-logs` in the repo, committed as I went.

## 4:20 – Close (20 s)

> Next would be accounts and payments, moderation so the gallery can open up, and looping video previews on the presets. The link and the repo are in the submission. Thanks.
