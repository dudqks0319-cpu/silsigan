import assert from "node:assert/strict";
import test from "node:test";

const {
  calculateCreditBalance,
  creditEventForQuestion,
  creditEventsForReport,
  getCategorySafetyWarning,
  getQuestionCost,
  getReportExpiry,
  isReportExpired,
  shouldHideForFlags,
  verifiedRadiusFromDistance,
} = await import(new URL("../src/lib/domain.ts", import.meta.url).href);

const { createQuestion, createReport, listQuestions } = await import(
  new URL("../src/lib/mock-store.ts", import.meta.url).href
);

test("reports expire three hours after creation", () => {
  const createdAt = new Date("2026-05-08T00:00:00.000Z");
  const expiresAt = getReportExpiry(createdAt);

  assert.equal(expiresAt.toISOString(), "2026-05-08T03:00:00.000Z");
  assert.equal(isReportExpired(expiresAt, new Date("2026-05-08T02:59:59.000Z")), false);
  assert.equal(isReportExpired(expiresAt, new Date("2026-05-08T03:00:00.000Z")), true);
});

test("question credits follow MVP cost rules", () => {
  assert.equal(getQuestionCost("crowd"), 1);
  assert.equal(getQuestionCost("photo_request"), 2);
  assert.deepEqual(creditEventForQuestion("photo_request"), {
    type: "ask_photo_request",
    amount: -2,
  });
});

test("credit balance supports signup, reports, answers, questions, and false-report penalty", () => {
  const balance = calculateCreditBalance([
    { type: "signup_bonus", amount: 3 },
    ...creditEventsForReport(true, true),
    { type: "answer_question", amount: 2 },
    creditEventForQuestion("other"),
    { type: "confirmed_false_report", amount: -5 },
  ]);

  assert.equal(balance, 1);
});

test("sensitive categories return upload warnings", () => {
  assert.match(getCategorySafetyWarning("hospital") ?? "", /환자 얼굴/);
  assert.match(getCategorySafetyWarning("public_office") ?? "", /서류/);
  assert.equal(getCategorySafetyWarning("parking"), null);
});

test("flag rules hide privacy-sensitive, repeated false, or high-volume reports", () => {
  assert.equal(shouldHideForFlags(["privacy_face"]), true);
  assert.equal(shouldHideForFlags(["false_content"]), false);
  assert.equal(shouldHideForFlags(["false_content", "false_content"]), true);
  assert.equal(shouldHideForFlags(["spam", "other"]), false);
  assert.equal(shouldHideForFlags(["spam", "other", "false_content"]), true);
});

test("verified radius stores only coarse radius buckets", () => {
  assert.equal(verifiedRadiusFromDistance(30), 50);
  assert.equal(verifiedRadiusFromDistance(50), 50);
  assert.equal(verifiedRadiusFromDistance(51), 150);
  assert.equal(verifiedRadiusFromDistance(120), 150);
  assert.equal(verifiedRadiusFromDistance(150), 150);
  assert.equal(verifiedRadiusFromDistance(151), 300);
  assert.equal(verifiedRadiusFromDistance(250), 300);
  assert.equal(verifiedRadiusFromDistance(300), 300);
  assert.equal(verifiedRadiusFromDistance(300.01), null);
  assert.equal(verifiedRadiusFromDistance(301), null);
});

test("distance outside 300m cannot produce a persisted verification radius", () => {
  assert.equal(verifiedRadiusFromDistance(1_000), null);
});

test("report creation returns a coarse radius and does not persist client coordinates", () => {
  const result = createReport({
    placeId: "ulsan-taehwagang",
    category: "tourism",
    crowdLevel: "normal",
    lineStatus: "short",
    parkingStatus: "limited",
    weatherFeel: "windy",
    comment: "주차장은 조금 붐벼요.",
    clientLocation: {
      latitude: 35.5486,
      longitude: 129.3005,
    },
  });

  assert.equal(result.report.verifiedRadiusM, 50);
  assert.equal("clientLocation" in result.report, false);
  assert.equal("latitude" in result.report, false);
  assert.equal("longitude" in result.report, false);
});

test("report creation can publish without field verification when location is absent", () => {
  const result = createReport({
    placeId: "gyeongju-hwangridan",
    category: "restaurant_cafe",
    crowdLevel: "busy",
    lineStatus: "medium",
    parkingStatus: "limited",
    weatherFeel: "good",
    comment: "인증 없이 올리는 제보입니다.",
    photoMime: "image/jpeg",
    photoSizeBytes: 1_024,
    photoName: "cafe.jpg",
  });

  const earned = result.credits.reduce((sum: number, event: { amount: number }) => sum + Math.max(event.amount, 0), 0);

  assert.equal(result.report.verifiedRadiusM, null);
  assert.equal("clientLocation" in result.report, false);
  assert.equal("latitude" in result.report, false);
  assert.equal("longitude" in result.report, false);
  assert.equal(earned, 1);
  assert.match(result.privacyNotice, /현장 인증 없이/);
});

test("report creation rejects reports outside the verified radius", () => {
  try {
    createReport({
        placeId: "ulsan-taehwagang",
        category: "tourism",
        crowdLevel: "normal",
        lineStatus: "short",
        parkingStatus: "limited",
        weatherFeel: "windy",
        comment: "멀리서 올린 제보입니다.",
        clientLocation: {
          latitude: 35.0,
          longitude: 129.0,
        },
      });
    assert.fail("Expected createReport to reject distant location");
  } catch (error) {
    assert.equal((error as { code?: string }).code, "LOCATION_NOT_VERIFIED");
  }
});

test("question creation ignores spoofed client credits when server balance is lower", () => {
  try {
    createQuestion(
        {
          placeId: "ulsan-taehwagang",
          questionType: "photo_request",
          body: "사진으로 볼 수 있을까요?",
          availableCredits: 999,
        },
        {
          getCreditBalance: () => 0,
        },
      );
    assert.fail("Expected createQuestion to reject insufficient server credits");
  } catch (error) {
    assert.equal((error as { code?: string }).code, "INSUFFICIENT_CREDITS");
  }
});

test("question creation does not write when credits are insufficient", () => {
  const before = listQuestions("ulsan-taehwagang").length;

  try {
    createQuestion(
        {
          placeId: "ulsan-taehwagang",
          questionType: "photo_request",
          body: "사진 요청 질문입니다.",
        },
        {
          getCreditBalance: () => 1,
        },
      );
    assert.fail("Expected createQuestion to reject insufficient credits");
  } catch (error) {
    assert.equal((error as { code?: string }).code, "INSUFFICIENT_CREDITS");
  }

  assert.equal(listQuestions("ulsan-taehwagang").length, before);
});
