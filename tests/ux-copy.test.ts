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

test("home prioritizes search, live photos, status reports, and internal popular places", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  for (const label of [
    "추천 검색어",
    "태화강 주차",
    "광안리 사람 많음",
    "황리단길 웨이팅",
    "출발 전 10초",
    "방금 올라온 현장으로 확인하세요",
    "방금 올라온 현장",
    "사진 없는 상태 제보",
    "지금 많이 확인하는 곳",
    "최근 3시간 제보/질문 기준",
    "지도는 위치를 알려주고",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /home-brand-card/);
  assert.match(source, /search-suggestion-row/);
  assert.match(source, /status-report-card/);
  assert.match(source, /reportMetaLine/);
  assert.match(source, /verificationToneClass/);
  assert.match(source, /getPopularPlaces/);
});

test("place detail exposes navigation intent and answer completion feedback", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  for (const label of [
    "답변 중인 질문",
    "현장 인증 후 답변하면 물어보기권 +2",
    "근처 사용자에게 물어보는 중",
    "카카오내비로 길찾기",
    "티맵으로 길찾기",
    "카카오톡 공유 카드",
    "#실시간 현장 제보",
    "출발 전 확인하기",
    "질문자에게 전달됐습니다",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /navigationIntentByPlaceId/);
  assert.match(source, /nav-cta-card/);
  assert.match(source, /sharePlaceSnapshot/);
  assert.match(source, /shareTextForPlace/);
});

test("first-use consent modal covers terms, privacy, location, and photo policy", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");

  assert.match(source, /PolicyConsentModal/);
  assert.match(source, /silsigan[\s\S]+policy[\s\S]+consent[\s\S]+v1/);
  assert.match(source, /위치와 사진을 현장 인증에만 사용합니다/);
  assert.match(source, /정확한 위치는 공개하지 않고/);
  assert.match(source, /전체 동의하고 계속/);
  assert.match(source, /자세히 보기/);
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

test("legal pages include beta-ready policy details", async () => {
  const privacy = await readFile(new URL("../src/app/privacy/page.tsx", import.meta.url), "utf8");
  const location = await readFile(new URL("../src/app/location-terms/page.tsx", import.meta.url), "utf8");
  const photo = await readFile(new URL("../src/app/photo-policy/page.tsx", import.meta.url), "utf8");
  const terms = await readFile(new URL("../src/app/terms/page.tsx", import.meta.url), "utf8");

  for (const label of ["수집 항목", "수집 목적", "보관 기간", "사용자 권리", "문의 이메일"]) {
    assert.match(privacy, new RegExp(label));
  }

  assert.match(location, /위치정보 이용 목적/);
  assert.match(location, /정확한 좌표는 저장하지 않습니다/);
  assert.match(photo, /사진 삭제 요청/);
  assert.match(photo, /병원 내부/);
  assert.match(terms, /물어보기권/);
  assert.match(terms, /신고 처리 기준/);
});
