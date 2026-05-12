import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const {
  crowdLevels,
  lineStatuses,
  parkingStatuses,
  questionTypes,
  reportCategories,
  weatherFeels,
} = await import(new URL("../src/lib/domain.ts", import.meta.url).href);

const {
  crowdOptions,
  lineOptions,
  parkingOptions,
  questionTypes: uiQuestionTypes,
  weatherOptions,
} = await import(new URL("../src/components/silsigan/mock-data.ts", import.meta.url).href);

test("UI options use canonical domain enum values", () => {
  assert.deepEqual(crowdOptions.map((option: { value: string }) => option.value), [...crowdLevels]);
  assert.deepEqual(lineOptions.map((option: { value: string }) => option.value), [...lineStatuses]);
  assert.deepEqual(parkingOptions.map((option: { value: string }) => option.value), [...parkingStatuses]);
  assert.deepEqual(weatherOptions.map((option: { value: string }) => option.value), [...weatherFeels]);
  assert.deepEqual(uiQuestionTypes.map((option: { value: string }) => option.value), [...questionTypes]);
});

test("domain enum literals match Supabase migration enum literals", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260508183000_initial_silsigan_schema.sql", import.meta.url),
    "utf8",
  );

  assert.deepEqual(parseSqlEnum(sql, "place_category"), [...reportCategories]);
  assert.deepEqual(parseSqlEnum(sql, "crowd_level"), [...crowdLevels]);
  assert.deepEqual(parseSqlEnum(sql, "line_status"), [...lineStatuses]);
  assert.deepEqual(parseSqlEnum(sql, "parking_status"), [...parkingStatuses]);
  assert.deepEqual(parseSqlEnum(sql, "weather_feel"), [...weatherFeels]);
  assert.deepEqual(parseSqlEnum(sql, "question_type"), [...questionTypes]);
});

test("beta Supabase migration allows unverified reports and adds RPC transactions", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260512090000_beta_supabase_backend.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /add column if not exists location_verified boolean not null default false/);
  assert.match(sql, /alter column verified_radius_m drop not null/);
  assert.match(sql, /verified_radius_m is null or verified_radius_m in \(50, 150, 300\)/);
  assert.match(sql, /create or replace function public\.create_question_with_credit/);
  assert.match(sql, /create or replace function public\.create_report_with_credits/);
  assert.match(sql, /INSUFFICIENT_CREDITS/);
  assert.match(sql, /insert into storage\.buckets/);
});

test("beta Supabase migration protects report rewards and private photos", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260512090000_beta_supabase_backend.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /update public\.reports\s+set location_verified = true\s+where verified_radius_m is not null/i);
  assert.match(sql, /create table if not exists public\.report_photo_uploads/i);
  assert.match(sql, /public\s+=\s+false/i);
  assert.match(sql, /revoke execute on function public\.create_report_with_credits/i);
  assert.doesNotMatch(sql, /grant execute on function public\.create_report_with_credits[\s\S]+to authenticated/i);
  assert.match(sql, /grant execute on function public\.create_report_with_credits[\s\S]+to service_role/i);
  assert.match(sql, /p_user_id uuid/i);
  assert.match(sql, /PHOTO_UPLOAD_NOT_FOUND/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
});

test("operational hardening migration supports stale photo cleanup and question answers", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260512103000_beta_operational_hardening.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /create or replace function public\.list_stale_report_photo_uploads/i);
  assert.match(sql, /consumed_at is null/i);
  assert.match(sql, /interval '24 hours'/i);
  assert.match(sql, /p_answer_question_id uuid/i);
  assert.match(sql, /ANSWER_LOCATION_REQUIRED/i);
  assert.match(sql, /answer_question/i);
  assert.match(sql, /answered_report_id = v_report\.id/i);
  assert.match(sql, /grant execute on function public\.list_stale_report_photo_uploads/i);
});

test("security release gate removes raw public table reads and grants signup credits once", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260512120000_beta_security_release_gate.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /drop policy if exists "visible reports are publicly readable" on public\.reports/i);
  assert.match(sql, /drop policy if exists "place questions are publicly readable" on public\.questions/i);
  assert.match(sql, /drop view if exists public\.active_reports/i);
  assert.match(sql, /create view public\.active_reports/i);
  assert.match(sql, /create view public\.public_active_reports/i);
  assert.match(sql, /create view public\.public_place_questions/i);
  assert.match(sql, /\(photo_path is not null\) as has_photo/i);
  assert.doesNotMatch(extractView(sql, "active_reports"), /\buser_id\b/i);
  assert.doesNotMatch(extractView(sql, "active_reports"), /\bphoto_path,\b/i);
  assert.doesNotMatch(extractView(sql, "public_active_reports"), /\buser_id\b/i);
  assert.doesNotMatch(extractView(sql, "public_active_reports"), /\bphoto_path,\b/i);
  assert.doesNotMatch(extractView(sql, "public_place_questions"), /\buser_id\b/i);
  assert.match(sql, /credit_events_signup_once_idx/i);
  assert.match(sql, /create or replace function public\.ensure_profile_with_signup_bonus/i);
  assert.match(sql, /values \(p_user_id, 'signup_bonus', 3\)/i);
  assert.match(sql, /perform public\.ensure_profile_with_signup_bonus\(v_user_id\)/i);
  assert.match(sql, /revoke execute on function public\.ensure_profile_with_signup_bonus/i);
  assert.match(sql, /grant execute on function public\.ensure_profile_with_signup_bonus\(uuid\) to service_role/i);
});

function parseSqlEnum(sql: string, enumName: string) {
  const match = new RegExp(`create type public\\.${enumName} as enum \\(([^;]+)\\);`).exec(sql);
  assert.ok(match, `Missing enum ${enumName}`);

  return match[1]
    .split(",")
    .map((value) => value.trim().replaceAll("'", ""));
}

function extractView(sql: string, viewName: string) {
  const match = new RegExp(`create view public\\.${viewName} as([\\s\\S]+?);`, "i").exec(sql);
  assert.ok(match, `Missing view ${viewName}`);

  return match[1];
}
