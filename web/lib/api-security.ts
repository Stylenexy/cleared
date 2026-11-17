// These limits are per process. Public deployments still need a shared edge quota.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const BODY_LIMITS = {
  attack: 128_000,
  parse: 20_100_000,
  config: 0,
  ledger: 0,
};
const WINDOW_MS = 60_000;
export function createRateLimiter(now = Date.now, maxKeys = 4096) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return (key: string, limit: number): boolean => {
    const time = now();
    for (const [id, bucket] of buckets)
      if (bucket.expires <= time) buckets.delete(id);
    // A full table fails closed instead of evicting active limits.
    if (!buckets.has(key) && buckets.size >= maxKeys) return false;
    const bucket = buckets.get(key) ?? { count: 0, expires: time + WINDOW_MS };
    buckets.set(key, bucket);
    return ++bucket.count <= limit;
  };
}
const allow = createRateLimiter();

export function guardRequest(
  request: Request,
  route: keyof typeof BODY_LIMITS,
) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(403, "Cross-origin requests are not allowed.");
  // Vercel overwrites forwarding headers at its edge. Outside that trusted
  // proxy all requests share one bucket; arbitrary client IP headers are ignored.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          .trim()
          .slice(0, 64) || "unknown"
      : "local";
  if (!allow(`${route}:${ip}`, route === "config" ? 60 : 20))
    throw new ApiError(429, "Too many requests. Retry in one minute.");
  const length = request.headers.get("content-length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > BODY_LIMITS[route])
  )
    throw new ApiError(413, "Request body is too large.");
  if (
    (route === "config" || route === "ledger") &&
    (request.body || new URL(request.url).search)
  )
    throw new ApiError(
      400,
      route === "config"
        ? "Configuration takes no input."
        : "Ledger takes no input.",
    );
}

// Count bytes while streaming, including requests without Content-Length.
// Never call request.text()/formData() until this bound has been applied.
export async function readBody(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, "Request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function apiFailure(error: unknown, fallback: string) {
  // Parser/provider errors can include untrusted data. Only our own errors
  // carry public messages; no environment values or provider payloads escape.
  if (!(error instanceof ApiError)) {
    // Server log only: error class and a bounded summary, never request bodies.
    const e = error as { name?: string; shortMessage?: string; message?: string };
    console.error(
      `[api] ${fallback} ${e?.name ?? "Error"}: ${String(e?.shortMessage ?? e?.message ?? "").slice(0, 300)}`,
    );
  }
  return Response.json(
    { error: error instanceof ApiError ? error.message : fallback },
    {
      status: error instanceof ApiError ? error.status : 400,
      headers: {
        "Cache-Control": "no-store",
        ...(error instanceof ApiError && error.status === 429
          ? { "Retry-After": "60" }
          : {}),
      },
    },
  );
}
