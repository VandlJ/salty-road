import Redis from "ioredis";

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

const REDIS_URL = process.env.REDIS_URL;
let warnedMissingRedis = false;

declare global {
  // allow global var across module reloads / warm serverless invocations
  var __redisClient__: Redis | undefined;
}

function getRedisClient(): Redis | null {
  if (!REDIS_URL) return null;
  if (!global.__redisClient__) {
    const isTls = REDIS_URL.startsWith("rediss://");
    // ioredis's own `rediss://` handling sets a bare `tls: true`, which
    // doesn't reliably carry SNI through a TLS-terminating reverse proxy
    // (e.g. Traefik routing by HostSNI) — passing servername explicitly
    // is what actually gets the right certificate back.
    global.__redisClient__ = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      tls: isTls ? { servername: new URL(REDIS_URL).hostname } : undefined,
    });
    global.__redisClient__.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
  }
  return global.__redisClient__;
}

// Serverless functions don't share memory across instances, so the in-memory
// fallback only rate-limits per warm instance — good enough to blunt casual
// abuse, not a hard guarantee. Set REDIS_URL (self-hosted Redis) for a real
// shared limit across all instances.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!REDIS_URL && process.env.NODE_ENV === "production" && !warnedMissingRedis) {
    warnedMissingRedis = true;
    console.warn(
      "REDIS_URL not set in production — rate limits are per-instance in-memory only, not shared across serverless instances."
    );
  }
  const redis = getRedisClient();
  if (redis) {
    try {
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const results = await redis
        .multi()
        .incr(key)
        .expire(key, windowSeconds, "NX")
        .exec();
      const count = results?.[0]?.[1];
      if (typeof count !== "number") throw new Error("Unexpected Redis response shape");
      return count <= limit;
    } catch (err) {
      console.error("Redis rate limit failed, falling back to in-memory:", err);
      return memoryRateLimit(key, limit, windowMs);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  // Vercel sets this itself and it can't be spoofed by the client, unlike
  // x-forwarded-for which anyone can send when not behind a trusted proxy.
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
