import * as mockStore from "./mock-store.ts";
import { ApiError } from "./errors.ts";
import { isSupabaseConfigured } from "./supabase-server.ts";
import * as supabaseStore from "./supabase-store.ts";
import type {
  AccountDeletionRequestInput,
  AccountDeletionActionInput,
  BlockReportAuthorInput,
  CreateQuestionInput,
  CreateReportInput,
  FlagReportInput,
  ModerationActionInput,
  UnblockUserInput,
} from "./validators.ts";

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

export async function listPublicReports(
  filters: { placeId?: string; includeExpired?: boolean } = {},
  options: RequestOptions = {},
) {
  return usingSupabaseStore()
    ? supabaseStore.listPublicReports(filters, { request: options.request })
    : mockStore.listPublicReports(filters, { actorId: options.actorId });
}

export async function createReport(input: CreateReportInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.createReport(input, { request: options.request });
  }

  return mockStore.createReport(input, { actorId: options.actorId });
}

export async function listPublicQuestions(placeId?: string, options: RequestOptions = {}) {
  return usingSupabaseStore()
    ? supabaseStore.listPublicQuestions(placeId, { request: options.request })
    : mockStore.listPublicQuestions(placeId, { actorId: options.actorId });
}

export async function listMyQuestions(options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.listMyQuestions({ request: options.request });
  }

  return mockStore.listMyQuestions({ actorId: options.actorId });
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

export async function listUserBlocks(options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.listUserBlocks({ request: options.request });
  }

  return mockStore.listUserBlocks({ actorId: options.actorId });
}

export async function blockReportAuthor(input: BlockReportAuthorInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.blockReportAuthor(input, { request: options.request });
  }

  return mockStore.blockReportAuthor(input, { actorId: options.actorId });
}

export async function unblockUser(input: UnblockUserInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.unblockUser(input, { request: options.request });
  }

  return mockStore.unblockUser(input, { actorId: options.actorId });
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

export async function requestAccountDeletion(input: AccountDeletionRequestInput, options: RequestOptions = {}) {
  if (usingSupabaseStore() && options.request) {
    return supabaseStore.requestAccountDeletion(input, { request: options.request });
  }

  return mockStore.requestAccountDeletion(input, { actorId: options.actorId });
}

export async function listAccountDeletionRequests() {
  return usingSupabaseStore() ? supabaseStore.listAccountDeletionRequests() : mockStore.listAccountDeletionRequests();
}

export async function handleAccountDeletionRequest(input: AccountDeletionActionInput) {
  return usingSupabaseStore()
    ? supabaseStore.handleAccountDeletionRequest(input)
    : mockStore.handleAccountDeletionRequest(input);
}

function resolveStoreMode() {
  if (isDemoMockStoreEnabled()) {
    return "mock";
  }

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

function isDemoMockStoreEnabled() {
  return process.env.SILSIGAN_DEMO_MODE === "true";
}
