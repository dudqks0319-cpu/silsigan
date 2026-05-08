import { ApiError } from "./errors.ts";

export function assertAdminTokenHeader(request: Request, expectedToken = process.env.ADMIN_MODERATION_TOKEN) {
  const authHeader = request.headers.get("authorization");

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    throw new ApiError(401, "ADMIN_AUTH_REQUIRED", "운영자 권한이 필요합니다.");
  }
}

export function isAdminCookieAuthorized(cookieValue: string | undefined, expectedToken = process.env.ADMIN_MODERATION_TOKEN) {
  return Boolean(expectedToken && cookieValue === expectedToken);
}
