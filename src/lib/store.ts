import * as mockStore from "./mock-store.ts";
import { isSupabaseConfigured } from "./supabase-server.ts";
import * as supabaseStore from "./supabase-store.ts";
import type { CreateQuestionInput, CreateReportInput, FlagReportInput, ModerationActionInput } from "./validators.ts";

type RequestOptions = {
  request?: Request;
  actorId?: string;
};

export function usingSupabaseStore() {
  return isSupabaseConfigured();
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
