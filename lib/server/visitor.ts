import { cookies, headers } from "next/headers";

const COOKIE = "take_one_visitor";

// There are no accounts: an anonymous ID in a long-lived cookie owns the history.
// Only call this from Route Handlers, where setting a cookie is allowed.
export async function visitorId() {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  const id = crypto.randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

export async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}
