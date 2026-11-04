import { put } from "@vercel/blob";
import { visitorId } from "@/lib/server/visitor";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Start images for video takes. AI Gateway needs a hosted URL rather than inline
// bytes for asynchronous jobs, so the image goes to Blob first.
export async function POST(request: Request) {
  await visitorId();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Use an image under 4 MB." }, { status: 413 });

  try {
    const blob = await put(`uploads/${crypto.randomUUID()}.${ext}`, file, { access: "public", contentType: file.type });
    return Response.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error("upload failed", error);
    return Response.json({ error: "The image couldn't be uploaded. Try again." }, { status: 503 });
  }
}
