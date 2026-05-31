/**
 * Server-key rate limiting for /api/analyze.
 *
 * In-memory store works for local dev and single-instance runs.
 * On Vercel serverless, counters reset per instance — use Upstash for production.
 * See ARCHITECTURE.md § Rate limiter.
 */

export const RATE_LIMITS = {
  perIpPerHour: 3,
  globalPerDay: 20,
} as const;

type Bucket = {
  hourly: { windowStart: number; count: number };
  daily: { dayKey: string; count: number };
};

const store = new Map<string, Bucket>();
let globalDaily = { dayKey: "", count: 0 };

function currentDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function currentHourWindow(now: Date): number {
  return Math.floor(now.getTime() / (60 * 60 * 1000));
}

function getBucket(ip: string, now: Date): Bucket {
  const hourWindow = currentHourWindow(now);
  const dayKey = currentDayKey(now);
  let bucket = store.get(ip);

  if (!bucket) {
    bucket = {
      hourly: { windowStart: hourWindow, count: 0 },
      daily: { dayKey, count: 0 },
    };
    store.set(ip, bucket);
    return bucket;
  }

  if (bucket.hourly.windowStart !== hourWindow) {
    bucket.hourly = { windowStart: hourWindow, count: 0 };
  }
  if (bucket.daily.dayKey !== dayKey) {
    bucket.daily = { dayKey, count: 0 };
  }

  return bucket;
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "ip_hourly" | "global_daily";
      retryAfterSeconds?: number;
    };

export function checkRateLimit(ip: string, now = new Date()): RateLimitResult {
  const dayKey = currentDayKey(now);

  if (globalDaily.dayKey !== dayKey) {
    globalDaily = { dayKey, count: 0 };
  }

  if (globalDaily.count >= RATE_LIMITS.globalPerDay) {
    return { allowed: false, reason: "global_daily" };
  }

  const bucket = getBucket(ip, now);

  if (bucket.hourly.count >= RATE_LIMITS.perIpPerHour) {
    const nextHourMs = (bucket.hourly.windowStart + 1) * 60 * 60 * 1000;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((nextHourMs - now.getTime()) / 1000),
    );
    return { allowed: false, reason: "ip_hourly", retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordRateLimitHit(ip: string, now = new Date()): void {
  const dayKey = currentDayKey(now);

  if (globalDaily.dayKey !== dayKey) {
    globalDaily = { dayKey, count: 0 };
  }
  globalDaily.count += 1;

  const bucket = getBucket(ip, now);
  bucket.hourly.count += 1;
  bucket.daily.count += 1;
}

export function getClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}
