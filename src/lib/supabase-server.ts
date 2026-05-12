import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";

function getSupabaseEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();

  return Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
}

export function getReportPhotoBucket() {
  return process.env.SUPABASE_REPORT_PHOTO_BUCKET || "report-photos";
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export function createSupabaseServiceClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase 서비스 환경 변수가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseUserClient(request: Request): SupabaseClient {
  const token = getBearerToken(request);
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase 공개 환경 변수가 설정되지 않았습니다.");
  }

  if (!token) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function getRequiredUserId(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  const supabase = createSupabaseUserClient(request);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  return data.user.id;
}

export async function ensureProfile(userId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("ensure_profile_with_signup_bonus", {
    p_user_id: userId,
  });

  if (error) {
    throwSupabaseError(error, "PROFILE_UPSERT_FAILED", "프로필 생성에 실패했습니다.");
  }
}

export function throwSupabaseError(error: { message?: string; code?: string }, code = "SUPABASE_ERROR", message?: string): never {
  const rawMessage = error.message ?? "";

  if (rawMessage.includes("AUTH_REQUIRED")) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  if (rawMessage.includes("INSUFFICIENT_CREDITS")) {
    throw new ApiError(402, "INSUFFICIENT_CREDITS", "물어보기권이 부족합니다.");
  }

  if (rawMessage.includes("LOCATION_VERIFICATION_CONFLICT")) {
    throw new ApiError(400, "LOCATION_VERIFICATION_CONFLICT", "현장 인증 값이 올바르지 않습니다.");
  }

  if (rawMessage.includes("CATEGORY_MISMATCH")) {
    throw new ApiError(400, "CATEGORY_MISMATCH", "제보 카테고리가 장소 카테고리와 일치하지 않습니다.");
  }

  if (rawMessage.includes("PLACE_NOT_FOUND")) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다.");
  }

  if (rawMessage.includes("QUESTION_NOT_FOUND")) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "답변할 물어보기를 찾지 못했습니다.");
  }

  if (rawMessage.includes("ANSWER_LOCATION_REQUIRED")) {
    throw new ApiError(403, "ANSWER_LOCATION_REQUIRED", "질문 답변 보상은 현장 인증 제보에만 지급됩니다.");
  }

  if (rawMessage.includes("PHOTO_UPLOAD_NOT_FOUND")) {
    throw new ApiError(400, "PHOTO_UPLOAD_NOT_FOUND", "업로드된 사진을 확인하지 못했습니다.");
  }

  throw new ApiError(500, code, message ?? "Supabase 요청 처리 중 오류가 발생했습니다.", {
    supabaseCode: error.code,
  });
}
