import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const {
  blockReportAuthor,
  createQuestion,
  createReport,
  listPublicReports,
  listUserBlocks,
  requestAccountDeletion,
  unblockUser,
} = await import(new URL("../src/lib/mock-store.ts", import.meta.url).href);
const store = await import(new URL("../src/lib/store.ts", import.meta.url).href);
const { validatePhotoUpload, sanitizePhotoUpload } = await import(
  new URL("../src/lib/photo-validation.ts", import.meta.url).href
);
const { validateStoredPhotoPath } = await import(new URL("../src/lib/photo-validation.ts", import.meta.url).href);
const { checkRateLimit, resetRateLimits } = await import(new URL("../src/lib/rate-limit.ts", import.meta.url).href);
const { assertAdminTokenHeader, isAdminCookieAuthorized } = await import(
  new URL("../src/lib/admin-auth.ts", import.meta.url).href
);
const { GET: getModerationFlags } = await import(
  new URL("../src/app/api/moderation-flags/route.ts", import.meta.url).href
);
const { GET: cleanupReportPhotos } = await import(
  new URL("../src/app/api/admin/cleanup-report-photos/route.ts", import.meta.url).href
);

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
  assert.ok(publicReports.every((report: { verifiedRadiusM?: number | null }) => "verifiedRadiusM" in report));
  assert.equal(JSON.stringify(publicReports).includes("clientLocation"), false);
});

test("unverified reports are accepted without leaking fallback coordinates", () => {
  const result = createReport({
    placeId: "ulsan-taehwagang",
    category: "tourism",
    crowdLevel: "normal",
    lineStatus: "short",
    parkingStatus: "limited",
    weatherFeel: "windy",
    comment: "위치 권한 없이 올린 제보입니다.",
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.report.verifiedRadiusM, null);
  assert.equal(serialized.includes("clientLocation"), false);
  assert.equal(serialized.includes("35.5486"), false);
  assert.equal(serialized.includes("129.3005"), false);
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

test("photo uploads use a dedicated rate limit bucket", () => {
  resetRateLimits();

  for (let index = 0; index < 6; index += 1) {
    checkRateLimit({ action: "upload_report_photo", actorId: "actor-photo", now: 2_000 });
  }

  assert.throws(
    () => checkRateLimit({ action: "upload_report_photo", actorId: "actor-photo", now: 2_000 }),
    (error: unknown) => (error as { code?: string }).code === "RATE_LIMITED",
  );
});

test("blocked report authors are hidden from the viewer public feed", () => {
  const actorId = `blocker-${crypto.randomUUID()}`;
  const before = listPublicReports({ placeId: "busan-gwangalli" }, { actorId });
  const targetReport = before.find((report: { id: string }) => report.id === "report_seed_busan_1");

  assert.ok(targetReport);
  const block = blockReportAuthor({ reportId: "report_seed_busan_1" }, { actorId });
  assert.equal(listUserBlocks({ actorId }).some((entry: { blockedUserId: string }) => entry.blockedUserId === block.blockedUserId), true);

  const after = listPublicReports({ placeId: "busan-gwangalli" }, { actorId });
  assert.equal(after.some((report: { id: string }) => report.id === "report_seed_busan_1"), false);

  unblockUser({ blockedUserId: block.blockedUserId }, { actorId });
  const restored = listPublicReports({ placeId: "busan-gwangalli" }, { actorId });
  assert.equal(restored.some((report: { id: string }) => report.id === "report_seed_busan_1"), true);
});

test("account deletion requests use pending status until an operator handles them", () => {
  const actorId = `delete-${crypto.randomUUID()}`;
  const request = requestAccountDeletion({ reason: "계정 정리 요청" }, { actorId });

  assert.equal(request.status, "pending");
});

test("production and preview environments cannot silently fall back to mock store", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousMockFlag = process.env.NEXT_PUBLIC_USE_MOCK_STORE;
  const previousDemoMode = process.env.SILSIGAN_DEMO_MODE;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_USE_MOCK_STORE = "true";
    setEnv("NODE_ENV", "production");
    delete process.env.VERCEL_ENV;

    assert.throws(
      () => store.usingSupabaseStore(),
      (error: unknown) => (error as { code?: string }).code === "SUPABASE_NOT_CONFIGURED",
    );

    setEnv("NODE_ENV", "development");
    setEnv("VERCEL_ENV", "preview");

    assert.throws(
      () => store.usingSupabaseStore(),
      (error: unknown) => (error as { code?: string }).code === "SUPABASE_NOT_CONFIGURED",
    );

    delete process.env.VERCEL_ENV;
    assert.equal(store.usingSupabaseStore(), false);

    process.env.SILSIGAN_DEMO_MODE = "true";
    setEnv("NODE_ENV", "production");
    setEnv("VERCEL_ENV", "production");
    assert.equal(store.usingSupabaseStore(), false);
  } finally {
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("VERCEL_ENV", previousVercelEnv);
    restoreEnv("NEXT_PUBLIC_USE_MOCK_STORE", previousMockFlag);
    restoreEnv("SILSIGAN_DEMO_MODE", previousDemoMode);
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", previousUrl);
    restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", previousAnon);
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", previousService);
  }
});

test("moderation queue requires an admin token", () => {
  assert.throws(
    () => assertAdminTokenHeader(new Request("http://localhost/api/moderation-flags"), undefined),
    (error: unknown) => (error as { code?: string }).code === "ADMIN_AUTH_REQUIRED",
  );

  assert.throws(
    () => assertAdminTokenHeader(new Request("http://localhost/api/moderation-flags"), "secret-token"),
    (error: unknown) => (error as { code?: string }).code === "ADMIN_AUTH_REQUIRED",
  );

  assert.doesNotThrow(() =>
    assertAdminTokenHeader(
      new Request("http://localhost/api/moderation-flags", {
        headers: { authorization: "Bearer secret-token" },
      }),
      "secret-token",
    ),
  );

  assert.equal(isAdminCookieAuthorized("secret-token", "secret-token"), true);
  assert.equal(isAdminCookieAuthorized("wrong-token", "secret-token"), false);
});

test("moderation queue route returns 401 without admin token", async () => {
  const previousToken = process.env.ADMIN_MODERATION_TOKEN;
  delete process.env.ADMIN_MODERATION_TOKEN;

  try {
    const response = await getModerationFlags(new Request("http://localhost/api/moderation-flags"));
    const payload = await response.json() as { error?: { code?: string } };

    assert.equal(response.status, 401);
    assert.equal(payload.error?.code, "ADMIN_AUTH_REQUIRED");
  } finally {
    if (previousToken === undefined) {
      delete process.env.ADMIN_MODERATION_TOKEN;
    } else {
      process.env.ADMIN_MODERATION_TOKEN = previousToken;
    }
  }
});

test("cleanup report photos route is protected by the admin token before store access", async () => {
  const previousToken = process.env.ADMIN_MODERATION_TOKEN;
  process.env.ADMIN_MODERATION_TOKEN = "cleanup-secret";

  try {
    const response = await cleanupReportPhotos(new Request("http://localhost/api/admin/cleanup-report-photos"));
    const payload = await response.json() as { error?: { code?: string } };

    assert.equal(response.status, 401);
    assert.equal(payload.error?.code, "ADMIN_AUTH_REQUIRED");
  } finally {
    restoreEnv("ADMIN_MODERATION_TOKEN", previousToken);
  }
});

test("cleanup report photos route validates optional before date", async () => {
  const previousToken = process.env.ADMIN_MODERATION_TOKEN;
  process.env.ADMIN_MODERATION_TOKEN = "cleanup-secret";

  try {
    const response = await cleanupReportPhotos(
      new Request("http://localhost/api/admin/cleanup-report-photos?before=not-a-date", {
        headers: { authorization: "Bearer cleanup-secret" },
      }),
    );
    const payload = await response.json() as { error?: { code?: string } };

    assert.equal(response.status, 400);
    assert.equal(payload.error?.code, "INVALID_CLEANUP_BEFORE");
  } finally {
    restoreEnv("ADMIN_MODERATION_TOKEN", previousToken);
  }
});

test("server profile helper uses the signup bonus RPC", async () => {
  const source = await readFile(new URL("../src/lib/supabase-server.ts", import.meta.url), "utf8");

  assert.match(source, /ensure_profile_with_signup_bonus/);
  assert.match(source, /p_user_id: userId/);
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

test("photo storage sanitization limits decoded image pixels", async () => {
  const source = await readFile(new URL("../src/lib/photo-validation.ts", import.meta.url), "utf8");

  assert.match(source, /MAX_PHOTO_PIXELS/);
  assert.match(source, /limitInputPixels: MAX_PHOTO_PIXELS/);
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
  assert.equal(sanitized.metadata.reencoded, false);
  assert.equal(sanitized.storagePath.includes("hospital-gps-user-name"), false);
});

test("stored photo paths must use sanitized UUID jpg paths", () => {
  assert.doesNotThrow(() => validateStoredPhotoPath("reports/11111111-1111-4111-8111-111111111111.jpg"));
  assert.throws(
    () => validateStoredPhotoPath("reports/hospital-gps-user-name.jpg"),
    (error: unknown) => (error as { code?: string }).code === "INVALID_PHOTO_PATH",
  );
});

test("browser Supabase helper does not reuse a permanently cached access token", async () => {
  const source = await readFile(new URL("../src/lib/supabase-browser.ts", import.meta.url), "utf8");

  assert.equal(source.includes("accessTokenPromise"), false);
  assert.match(source, /getSession\(\)/);
  assert.match(source, /signInAnonymously\(\)/);
});

test("photo upload route creates a profile before writing upload ownership", async () => {
  const source = await readFile(new URL("../src/app/api/report-photos/route.ts", import.meta.url), "utf8");

  assert.match(source, /ensureProfile\(userId\)/);
  assert.match(source, /upload_report_photo/);
  assert.ok(source.indexOf("ensureProfile(userId)") < source.indexOf("report_photo_uploads"));
});

test("unused photo cleanup removes storage objects before deleting upload records", async () => {
  const source = await readFile(new URL("../src/lib/supabase-store.ts", import.meta.url), "utf8");

  assert.match(source, /cleanupUnusedReportPhotos/);
  assert.match(source, /list_stale_report_photo_uploads/);
  assert.match(source, /storage\.from\(bucketName\)\.remove/);
  assert.match(source, /\.from\("report_photo_uploads"\)\s+\.delete\(\)/);
  assert.ok(source.indexOf("storage.from(bucketName).remove") < source.indexOf('.from("report_photo_uploads")'));
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function setEnv(key: string, value: string) {
  process.env[key] = value;
}
