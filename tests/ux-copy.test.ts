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
    "오늘 가기 전 체크",
    "날씨·관광·주차",
    "검색 결과",
    "아직 등록된 장소가 없어요",
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
  assert.match(source, /\/api\/place-context/);
  assert.match(source, /TodayContextStrip/);
  assert.match(source, /matchesPlaceSearch/);
});

test("place detail uses public context APIs as decision support", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");
  const context = await readFile(new URL("../src/lib/place-context.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/place-context/route.ts", import.meta.url), "utf8");

  for (const label of [
    "오늘 날씨와 주변 맥락",
    "공공 API 보강",
    "오늘 날씨",
    "근처 함께 볼 곳",
    "대기질",
    "주차 참고",
    "관광 관심도",
    "참고 정보는 공공 API 또는 베타 기본 데이터를 기준",
    "실제 현장 상황은 최근 제보를 우선",
    "아직 최근 제보가 없어요",
    "현장에 있다면 첫 제보",
    "답변 전까지는 공유해서 현장 답변을 요청",
  ]) {
    assert.match(source + context, new RegExp(label));
  }

  assert.match(route, /getPlaceContexts/);
  assert.match(context, /KMA_SHORT_TERM_SERVICE_KEY/);
  assert.match(context, /TOUR_API_SERVICE_KEY/);
  assert.match(context, /AIRKOREA_SERVICE_KEY/);
  assert.match(context, /PLACE_CONTEXT_EXTERNAL_APIS/);
  assert.match(context, /기상청 초단기예보/);
  assert.match(context, /한국관광공사 TourAPI/);
  assert.match(context, /에어코리아/);
  assert.match(context, /부산 공영주차장 API fallback/);
  assert.match(context, /관광 자원 수요/);
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
    "지금 상태 더 보기",
    "현장에 있다면 지금 상황 알려주기",
    "친구가 공유한 현장",
    "질문자에게 전달됐습니다",
  ]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /navigationIntentByPlaceId/);
  assert.match(source, /nav-cta-card/);
  assert.match(source, /sharePlaceSnapshot/);
  assert.match(source, /shareTextForPlace/);
  assert.match(source, /sharedPlaceIdFromUrl/);
  assert.match(source, /setActiveTab\("place"\)/);
  assert.match(source, /navigator\.clipboard\?\.writeText/);
  assert.match(source, /ManualShareSheet/);
  assert.match(source, /전체 선택/);
  assert.match(source, /silsigan:analytics/);
  assert.match(source, /share_button_clicked/);
  assert.match(source, /share_web_api_success/);
  assert.match(source, /share_clipboard_success/);
  assert.match(source, /share_manual_fallback_shown/);
  assert.match(source, /shared_link_opened/);
  assert.match(source, /shared_place_question_clicked/);
  assert.match(source, /shared_place_report_clicked/);
  assert.match(source, /\/share\/\$\{encodeURIComponent\(place\.id\)\}/);
});

test("share route provides OG metadata and redirects users into the app place detail", async () => {
  const page = await readFile(new URL("../src/app/share/[placeId]/page.tsx", import.meta.url), "utf8");
  const image = await readFile(new URL("../src/app/share/[placeId]/opengraph-image.tsx", import.meta.url), "utf8");
  const previews = await readFile(new URL("../src/lib/share-preview.ts", import.meta.url), "utf8");

  assert.match(page, /generateMetadata/);
  assert.match(page, /openGraph/);
  assert.match(page, /\/\?place=\$\{encodeURIComponent\(preview\.placeId\)\}&from=share/);
  assert.match(page, /ShareOpenApp/);
  assert.match(image, /ImageResponse/);
  assert.match(previews, /busan-gwangalli/);
  assert.match(previews, /8분 전 · 현장 인증 · 사진 있음/);
});

test("README reflects the current beta backend and share tracking state", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /Supabase Auth 익명 세션/);
  assert.match(readme, /RPC 트랜잭션/);
  assert.match(readme, /Storage/);
  assert.match(readme, /Sharp/);
  assert.match(readme, /\/share\/\[placeId\]/);
  assert.match(readme, /silsigan:analytics/);
  assert.match(readme, /\/api\/place-context/);
  assert.match(readme, /\/api\/user-blocks/);
  assert.match(readme, /기상청/);
  assert.match(readme, /TourAPI/);
});

test("mobile app harness and blue brand theme are configured", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const capacitor = await readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8");
  const icon = await readFile(new URL("../public/icon.svg", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const ogImage = await readFile(new URL("../src/app/share/[placeId]/opengraph-image.tsx", import.meta.url), "utf8");
  const fallback = await readFile(new URL("../public/capacitor/index.html", import.meta.url), "utf8");
  const androidColors = await readFile(new URL("../android/app/src/main/res/values/colors.xml", import.meta.url), "utf8");
  const androidManifest = await readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const iosPlist = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(readme, /iOS\/Android 앱 하네스/);
  assert.match(readme, /Capacitor/);
  assert.match(readme, /Android `assembleDebug` 빌드에는 로컬 JDK가 필요하다/);
  assert.match(readme, /safe-area inset/);
  assert.match(packageJson, /"@capacitor\/core"/);
  assert.match(packageJson, /mobile:sync/);
  assert.match(packageJson, /cap:sync:ios:local/);
  assert.match(packageJson, /cap:sync:android:local/);
  assert.match(capacitor, /kr\.silsigan\.app/);
  assert.match(capacitor, /public\/capacitor/);
  assert.match(capacitor, /CAPACITOR_SERVER_URL/);
  assert.match(manifest, /#2563eb/);
  assert.match(icon, /#2563eb/);
  assert.match(layout, /themeColor: "#2563eb"/);
  assert.match(ogImage, /#2563eb/);
  assert.match(fallback, /앱 하네스가 준비되었습니다/);
  assert.match(androidColors, /#2563EB/);
  assert.match(androidManifest, /ACCESS_FINE_LOCATION/);
  assert.match(iosPlist, /NSLocationWhenInUseUsageDescription/);
  assert.match(iosPlist, /NSPhotoLibraryUsageDescription/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("UGC user blocking is available for app store moderation expectations", async () => {
  const source = await readFile(new URL("../src/components/silsigan/SilsiganPrototype.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/user-blocks/route.ts", import.meta.url), "utf8");
  const store = await readFile(new URL("../src/lib/store.ts", import.meta.url), "utf8");
  const supabaseStore = await readFile(new URL("../src/lib/supabase-store.ts", import.meta.url), "utf8");
  const validators = await readFile(new URL("../src/lib/validators.ts", import.meta.url), "utf8");
  const rateLimit = await readFile(new URL("../src/lib/rate-limit.ts", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../supabase/migrations/20260514090000_beta_user_blocks.sql", import.meta.url),
    "utf8",
  );

  for (const label of ["이 사용자의 제보 숨기기", "차단한 사용자 목록", "차단 해제"]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /\/api\/user-blocks/);
  assert.match(route, /blockReportAuthor/);
  assert.match(route, /unblockUser/);
  assert.match(store, /listUserBlocks/);
  assert.match(store, /blockReportAuthor/);
  assert.match(supabaseStore, /user_blocks/);
  assert.match(supabaseStore, /getBlockedUserIdsForRequest/);
  assert.match(validators, /blockReportAuthorSchema/);
  assert.match(rateLimit, /block_user/);
  assert.match(migration, /create table if not exists public\.user_blocks/);
  assert.match(migration, /users can create own blocks/);
  assert.match(migration, /users can delete own blocks/);
});

test("account deletion can be requested inside the app", async () => {
  const page = await readFile(new URL("../src/app/account/delete/page.tsx", import.meta.url), "utf8");
  const form = await readFile(new URL("../src/app/account/delete/AccountDeletionRequestForm.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../src/app/api/account-deletion/route.ts", import.meta.url), "utf8");
  const store = await readFile(new URL("../src/lib/store.ts", import.meta.url), "utf8");
  const migration = await readFile(
    new URL("../supabase/migrations/20260513090000_beta_account_deletion_requests.sql", import.meta.url),
    "utf8",
  );

  assert.match(page, /계정 삭제 요청/);
  assert.match(form, /\/api\/account-deletion/);
  assert.match(form, /앱 안에서 삭제 요청을 시작/);
  assert.match(route, /request_account_deletion/);
  assert.match(store, /requestAccountDeletion/);
  assert.match(migration, /account_deletion_requests/);
  assert.match(migration, /status in \('pending', 'processing', 'completed', 'rejected'\)/);
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
  assert.match(terms, /사용자 차단/);
  assert.match(privacy, /차단 목록/);
});
