import { redis } from "./redis";

// Credits are spent against three daily limits (UTC days): the visitor's allowance,
// a per-IP cap that blunts clearing cookies, and a project-wide cap so one bad day
// can't use up the month's AI Gateway budget.
export const LIMITS = {
  visitor: Number(process.env.DAILY_VISITOR_CREDITS ?? 150),
  ip: Number(process.env.DAILY_IP_CREDITS ?? 300),
  global: Number(process.env.DAILY_GLOBAL_CREDITS ?? 800),
};

export type CreditsState = { allowance: number; spent: number; remaining: number; resetsAt: string };

export type ReserveResult = { ok: true } | { ok: false; reason: "visitor" | "ip" | "global"; remaining: number };

export function creditDay() {
  return new Date().toISOString().slice(0, 10);
}

function keys(visitor: string, ip: string, d = creditDay()) {
  return { visitor: `credits:v:${visitor}:${d}`, ip: `credits:ip:${ip}:${d}`, global: `credits:all:${d}` };
}

function nextResetIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

export async function creditsFor(visitor: string): Promise<CreditsState> {
  const spent = Number((await redis().get<number>(keys(visitor, "").visitor)) ?? 0);
  return { allowance: LIMITS.visitor, spent, remaining: Math.max(0, LIMITS.visitor - spent), resetsAt: nextResetIso() };
}

export async function reserveCredits(visitor: string, ip: string, amount: number): Promise<ReserveResult> {
  const k = keys(visitor, ip);
  const tx = redis().multi();
  tx.incrby(k.visitor, amount).expire(k.visitor, 60 * 60 * 48);
  tx.incrby(k.ip, amount).expire(k.ip, 60 * 60 * 48);
  tx.incrby(k.global, amount).expire(k.global, 60 * 60 * 48);
  const [visitorSpent, , ipSpent, , globalSpent] = (await tx.exec()) as number[];

  const over =
    visitorSpent > LIMITS.visitor ? "visitor" : ipSpent > LIMITS.ip ? "ip" : globalSpent > LIMITS.global ? "global" : null;
  if (!over) return { ok: true };

  await refundCredits(visitor, ip, amount);
  return { ok: false, reason: over, remaining: Math.max(0, LIMITS.visitor - (visitorSpent - amount)) };
}

// `day` is the day the credits were reserved, so a job that fails after midnight
// refunds the day it was charged to.
export async function refundCredits(visitor: string, ip: string, amount: number, day?: string) {
  const k = keys(visitor, ip, day);
  await redis().multi().decrby(k.visitor, amount).decrby(k.ip, amount).decrby(k.global, amount).exec();
}
