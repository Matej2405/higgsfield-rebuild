import { z } from "zod";
import { creditsFor } from "@/lib/server/credits";
import { createJob, listTakes, measuredEstimates } from "@/lib/server/jobs";
import { clientIp, visitorId } from "@/lib/server/visitor";

// Image takes are generated in after(), which runs within this route's duration.
export const maxDuration = 300;

const CreateTake = z.object({
  kind: z.enum(["image", "video"]),
  tier: z.enum(["draft", "standard", "cinematic"]),
  presetId: z.string().max(40).nullable(),
  prompt: z.string().max(2000),
  aspect: z.enum(["16:9", "9:16", "1:1"]),
  duration: z.number().int().positive().nullable(),
  startImageUrl: z.url().nullable(),
  parentId: z.uuid().nullable(),
});

export async function GET() {
  const visitor = await visitorId();
  try {
    const takes = await listTakes(visitor);
    // Only after listTakes: refreshing a take can refund it or record a new timing,
    // and this is the last response the browser polls for once nothing is rolling.
    const [credits, estimates] = await Promise.all([creditsFor(visitor), measuredEstimates()]);
    return Response.json({ takes, credits, estimates });
  } catch (error) {
    console.error("listing takes failed", error);
    return Response.json({ error: "Your takes couldn't be loaded. Refresh to try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const parsed = CreateTake.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That request wasn't understood. Refresh the page and try again." }, { status: 400 });

  const visitor = await visitorId();
  try {
    const result = await createJob(parsed.data, visitor, await clientIp());
    if (!result.ok) return Response.json({ error: result.error, code: result.code }, { status: result.status });
    return Response.json({ take: result.take, credits: await creditsFor(visitor) }, { status: 201 });
  } catch (error) {
    console.error("creating take failed", error);
    return Response.json({ error: "The take couldn't be started. Nothing was charged; try again." }, { status: 503 });
  }
}
