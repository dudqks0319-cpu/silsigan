import assert from "node:assert/strict";
import test from "node:test";

const { createQuestion, createReport, listPublicReports } = await import(
  new URL("../src/lib/mock-store.ts", import.meta.url).href
);
const { validatePhotoUpload, sanitizePhotoUpload } = await import(
  new URL("../src/lib/photo-validation.ts", import.meta.url).href
);
const { checkRateLimit, resetRateLimits } = await import(new URL("../src/lib/rate-limit.ts", import.meta.url).href);

test("public reports expose coarse radius but not exact client coordinates", () => {
  const latitude = 35.5486;
  const longitude = 129.3005;

  const result = createReport({
    placeId: "ulsan-taehwagang",
    category: "tourism",
    crowdLevel: "normal",
    lineStatus: "short",
    parkingStatus: "limited",
    weatherFeel: "windy",
    comment: "좌표는 저장되면 안 됩니다.",
    clientLocation: { latitude, longitude },
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.report.verifiedRadiusM, 50);
  assert.equal(serialized.includes("clientLocation"), false);
  assert.equal(serialized.includes(String(latitude)), false);
  assert.equal(serialized.includes(String(longitude)), false);

  const publicReports = listPublicReports({ placeId: "ulsan-taehwagang" });
  assert.ok(publicReports.every((report: { verifiedRadiusM?: number }) => report.verifiedRadiusM));
  assert.equal(JSON.stringify(publicReports).includes("clientLocation"), false);
});

test("server-side credit boundary ignores spoofed availableCredits", () => {
  const debits: { amount: number; type: string }[] = [];

  assert.throws(
    () =>
      createQuestion(
        {
          placeId: "ulsan-taehwagang",
          questionType: "photo_request",
          body: "사진 요청합니다.",
          availableCredits: 999,
        },
        {
          getCreditBalance: () => 0,
          recordCreditEvent: (event: { amount: number; type: string }) => debits.push(event),
        },
      ),
    (error: unknown) => (error as { code?: string }).code === "INSUFFICIENT_CREDITS",
  );

  assert.deepEqual(debits, []);
});

test("rate limiter blocks excessive actions by server-derived actor", () => {
  resetRateLimits();

  for (let index = 0; index < 12; index += 1) {
    checkRateLimit({ action: "create_report", actorId: "actor-a", now: 1_000 });
  }

  assert.throws(
    () => checkRateLimit({ action: "create_report", actorId: "actor-a", now: 1_000 }),
    (error: unknown) => (error as { code?: string }).code === "RATE_LIMITED",
  );
});

test("photo validation rejects unsupported and mismatched uploads", () => {
  assert.doesNotThrow(() =>
    validatePhotoUpload({
      name: "field.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1_024,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
    }),
  );

  assert.throws(
    () =>
      validatePhotoUpload({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        sizeBytes: 1_024,
      }),
    (error: unknown) => (error as { code?: string }).code === "UNSUPPORTED_PHOTO_TYPE",
  );

  assert.throws(
    () =>
      validatePhotoUpload({
        name: "fake.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1_024,
        bytes: new Uint8Array([0x3c, 0x68, 0x74, 0x6d]),
      }),
    (error: unknown) => (error as { code?: string }).code === "PHOTO_SIGNATURE_MISMATCH",
  );
});

test("photo sanitization strips EXIF intent and removes original filename", () => {
  const sanitized = sanitizePhotoUpload({
    name: "hospital-gps-user-name.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1_024,
    bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
  });

  assert.equal(sanitized.metadata.exifRemoved, true);
  assert.equal(sanitized.metadata.gpsRemoved, true);
  assert.equal(sanitized.storagePath.includes("hospital-gps-user-name"), false);
});
