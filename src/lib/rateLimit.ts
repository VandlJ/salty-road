const buckets = new Map<string, { count: number; resetAt: number }>();
let callsSinceSweep = 0;

function sweepExpired() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  callsSinceSweep += 1;
  if (callsSinceSweep >= 200) {
    callsSinceSweep = 0;
    sweepExpired();
  }
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = !!(UPSTASH_URL && UPSTASH_TOKEN);

// Serverless functions don't share memory across instances, so the in-memory
// fallback only rate-limits per warm instance — good enough to blunt casual
// abuse, not a hard guarantee. Set UPSTASH_REDIS_REST_URL/TOKEN for a real
// shared limit across all instances.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (hasUpstash) {
    try {
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const res = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSeconds, "NX"],
        ]),
      });
      if (!res.ok) throw new Error(`Upstash request failed: ${res.status}`);
      const data = await res.json();
      const count = data?.[0]?.result;
      if (typeof count !== "number") throw new Error("Unexpected Upstash response shape");
      return count <= limit;
    } catch (err) {
      console.error("Upstash rate limit failed, falling back to in-memory:", err);
      return memoryRateLimit(key, limit, windowMs);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
