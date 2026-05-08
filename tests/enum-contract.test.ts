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

function parseSqlEnum(sql: string, enumName: string) {
  const match = new RegExp(`create type public\\.${enumName} as enum \\(([^;]+)\\);`).exec(sql);
  assert.ok(match, `Missing enum ${enumName}`);

  return match[1]
    .split(",")
    .map((value) => value.trim().replaceAll("'", ""));
}
