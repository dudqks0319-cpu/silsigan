import * as mockStore from "./mock-store.ts";
import { ApiError } from "./errors.ts";
import { isSupabaseConfigured } from "./supabase-server.ts";
import * as supabaseStore from "./supabase-store.ts";
import type { CreateQuestionInput, CreateReportInput, FlagReportInput, ModerationActionInput } from "./validators.ts";

type RequestOptions = {
  request?: Request;
  actorId?: string;
};

export function usingSupabaseStore() {
  return resolveStoreMode() === "supabase";
}

export async function listPlaces() {
  return usingSupabaseStore() ? supabaseStore.listPlaces() : mockStore.listPlaces();
}

export async function listPublicReports(filters: { placeId?: string; includeExpired?: boolean } = {}) {
  return usingSupabaseStore() ? supabaseStore.listPublicReports(filters) : mockStore.listPublicReports(filters);
}

export async function createReport(input: CreateReportInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.createReport(input, { request: options.request });
  }

  return mockStore.createReport(input, { actorId: options.actorId });
}

export async function listPublicQuestions(placeId?: string) {
  return usingSupabaseStore() ? supabaseStore.listPublicQuestions(placeId) : mockStore.listPublicQuestions(placeId);
}

export async function createQuestion(input: CreateQuestionInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.createQuestion(input, { request: options.request });
  }

  return mockStore.createQuestion(input, { actorId: options.actorId });
}

export async function flagReport(input: FlagReportInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.flagReport(input, { request: options.request });
  }

  return mockStore.flagReport(input);
}

export async function getModerationQueue() {
  return usingSupabaseStore() ? supabaseStore.getModerationQueue() : mockStore.getModerationQueue();
}

export async function handleModerationAction(input: ModerationActionInput) {
  if (!usingSupabaseStore()) {
    return {
      reportId: input.reportId,
      action: input.action,
      handledAt: new Date().toISOString(),
    };
  }

  return supabaseStore.handleModerationAction(input);
}

export async function cleanupUnusedReportPhotos(before?: Date) {
  if (!usingSupabaseStore()) {
    return { deleted: 0 };
  }

  return supabaseStore.cleanupUnusedReportPhotos(before);
}

function resolveStoreMode() {
  if (isSupabaseConfigured()) {
    return "supabase";
  }

  if (isLocalMockStoreAllowed()) {
    return "mock";
  }

  throw new ApiError(
    503,
    "SUPABASE_NOT_CONFIGURED",
    "운영 또는 프리뷰 환경에서는 Supabase 설정이 필요합니다.",
  );
}

function isLocalMockStoreAllowed() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return false;
  }

  return process.env.NEXT_PUBLIC_USE_MOCK_STORE !== "false";
}
