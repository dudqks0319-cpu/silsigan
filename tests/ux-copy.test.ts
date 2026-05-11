import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reporting UX explains rewards and low-trust unverified reports", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  assert.match(source, /현장 인증 \+ 사진/);
  assert.match(source, /물어보기권 \+2/);
  assert.match(source, /현장 인증만/);
  assert.match(source, /인증 없음/);
  assert.match(source, /보상 없음/);
  assert.match(source, /낮은 신뢰도/);
});

test("place detail uses a dedicated trust card with photo and unverified counts", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  assert.match(source, /trust-metrics-card/);
  assert.match(source, /마지막 현장 인증/);
  assert.match(source, /최근 3시간 제보/);
  assert.match(source, /인증 없는 제보/);
  assert.match(source, /사진 있는 제보/);
});

test("map filters and answer CTA use Korean beta copy", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  for (const label of ["주차 만차", "줄 있음", "사람 많음", "한산함", "사진 있음", "현장 답변하기 +2"]) {
    assert.match(source, new RegExp(label.replace("+", "\\+")));
  }

  assert.match(source, /answerQuestionId/);
});

test("first-use consent modal covers terms, privacy, location, and photo policy", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  assert.match(source, /PolicyConsentModal/);
  assert.match(source, /silsigan[\s\S]+policy[\s\S]+consent[\s\S]+v1/);
  assert.match(source, /이용약관/);
  assert.match(source, /개인정보 처리방침/);
  assert.match(source, /위치기반서비스 이용약관/);
  assert.match(source, /사진 업로드 정책/);
});

test("legal policy pages are available in app routes", async () => {
  const pages = [
    "../src/app/terms/page.tsx",
    "../src/app/privacy/page.tsx",
    "../src/app/location-terms/page.tsx",
    "../src/app/photo-policy/page.tsx",
  ];

  for (const page of pages) {
    const source = await readFile(new URL(page, import.meta.url), "utf8");
    assert.match(source, /#실시간/);
  }
});
