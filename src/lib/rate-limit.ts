import { ApiError } from "./errors.ts";

type RateLimitAction =
  | "create_report"
  | "upload_report_photo"
  | "create_question"
  | "flag_report"
  | "block_user"
  | "unblock_user"
  | "request_account_deletion";

type RateLimitRule = {
  limit: number;
  windowMs: number;
};

const rules: Record<RateLimitAction, RateLimitRule> = {
  create_report: { limit: 12, windowMs: 60_000 },
  upload_report_photo: { limit: 6, windowMs: 60_000 },
  create_question: { limit: 20, windowMs: 60_000 },
  flag_report: { limit: 8, windowMs: 60_000 },
  block_user: { limit: 10, windowMs: 60_000 },
  unblock_user: { limit: 10, windowMs: 60_000 },
  request_account_deletion: { limit: 3, windowMs: 60_000 },
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function actorIdFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();

  return forwardedFor || realIp || forwardedHost || "anonymous";
}

export function checkRateLimit({
  action,
  actorId,
  now = Date.now(),
}: {
  action: RateLimitAction;
  actorId: string;
  now?: number;
}) {
  const rule = rules[action];
  const key = `${action}:${actorId}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  if (current.count >= rule.limit) {
    throw new ApiError(429, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", {
      limit: rule.limit,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    });
  }

  current.count += 1;
}

export function resetRateLimits() {
  buckets.clear();
}
