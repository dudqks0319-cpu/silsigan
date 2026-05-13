# #실시간

위치 기반 실시간 현장 제보 MVP입니다. 사용자는 현재 위치 주변의 사진과 현장 상태를 제보하고, 다른 사용자는 궁금한 장소의 현재 상황을 질문할 수 있습니다.

## MVP 범위

- 웹/PWA 우선
- Next.js + Supabase + Vercel
- 초기 지역: 울산, 부산, 경주
- 초기 카테고리: 관광지, 축제/행사장, 맛집/카페, 병원, 관공서, 주차장
- MVP 제외: 결제, 현금성 포인트, DM, 팔로우, 업체 광고, 네이티브 전용 기능, AI 자동 판독

## 보안/개인정보 원칙

- 정확한 사용자 위치는 공개하지 않는다.
- 위치 원본 좌표는 DB와 로그에 저장하지 않는다.
- 제보에는 장소와의 거리 구간만 저장한다.
- 사진은 EXIF 제거와 재인코딩 후 저장한다.
- 병원/관공서 카테고리는 민감정보 업로드를 보수적으로 제한한다.
- 모든 사용자 데이터는 Supabase RLS를 전제로 설계한다.
- 신고/숨김/삭제 운영이 준비되기 전에는 출시하지 않는다.

## 현재 구현 상태

- 프론트는 `/api/places`, `/api/reports`, `/api/questions`를 호출한다.
- 로컬 개발에서는 mock-store를 사용할 수 있고, Vercel Preview/Production에서는 Supabase 설정이 없으면 시작하지 않는다.
- Supabase Auth 익명 세션으로 API를 호출하고, 서버에서는 service role을 사용해 프로필과 원장을 처리한다.
- 질문 생성/물어보기권 차감과 제보 생성/보상 지급은 Supabase RPC 트랜잭션으로 처리한다.
- 신규 사용자는 signup bonus RPC로 물어보기권을 1회 지급한다.
- 제보/질문/신고/사진 업로드 API에는 기본 rate limit이 들어 있다.
- 위치 권한 실패 시 데모 위치로 현장 인증하지 않고, 인증 없는 제보로 낮은 신뢰도 표시한다.
- 사진 업로드는 `Sharp`로 JPEG 재인코딩하고 원본 파일명/EXIF/GPS 저장을 피한 뒤 Supabase Storage에 UUID 경로로 저장한다.
- 24시간 이상 제보에 연결되지 않은 사진 업로드를 정리하는 관리자 API가 있다.
- 관리자 신고 큐는 `/admin/moderation`에 있으며 `ADMIN_MODERATION_TOKEN` 없이는 큐와 cleanup API를 공개하지 않는다.
- 신고 숨김 처리 시 Storage 사진 삭제와 처리 로그 저장 흐름을 제공한다.
- 지도는 네이버 지도 JavaScript API v3를 사용하며 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 `ncpKeyId` 값을 넣으면 활성화된다.
- 홈은 검색, 방금 올라온 현장, 사진 없는 상태 제보, 지금 많이 확인하는 곳, 답변 가능한 질문 중심의 한국 웹 베타 UX로 구성되어 있다.
- 홈 검색창은 장소명, 주소, 카테고리, 주차/줄/웨이팅/혼잡/한산 같은 상황 키워드로 초기 장소를 필터링한다.
- `/api/place-context`는 오늘 날씨, 주변 관광/축제, 대기질, 주차 참고, 관광 관심도를 장소별 맥락 데이터로 제공한다.
- 로컬/키 미설정 환경에서는 안전한 fallback 데이터를 사용하고, `PLACE_CONTEXT_EXTERNAL_APIS=true`와 서버 전용 키가 있으면 기상청 초단기예보, 한국관광공사 TourAPI, 에어코리아 API를 조회한다.
- 공공 API 맥락 정보에는 fallback 가능성을 안내하고, 실제 현장 판단은 최근 제보를 우선하도록 표시한다.
- `/account/delete`에서는 앱 안에서 계정 삭제 요청을 시작할 수 있고, `/api/account-deletion`은 요청을 `account_deletion_requests`에 기록한다.
- 공유는 Web Share API를 우선 사용하고, 미지원 브라우저는 클립보드 복사 또는 수동 복사 모달로 fallback한다.
- 공유 URL은 `/share/[placeId]`에서 카카오톡/OG 메타를 제공한 뒤 `/?place=...&from=share`로 앱 장소 상세 진입을 유도한다.
- 공유 관련 주요 행동은 `silsigan:analytics` CustomEvent hook으로 발행하며, 추후 PostHog/Vercel Analytics/Supabase event table에 연결할 수 있다.
- 사용자 차단은 `/api/user-blocks`와 `user_blocks` 테이블로 처리하며, 차단한 작성자의 제보와 질문은 내 피드에서 숨긴다.
- iOS/Android 앱 하네스는 Capacitor 기반이며, `CAPACITOR_SERVER_URL` 또는 `NEXT_PUBLIC_SITE_URL`로 배포된 웹앱을 로드하는 구조다. Next.js API route가 필요하므로 스토어 제출 전에는 Vercel/Supabase 베타 환경을 연결해야 한다.

## 공공 API 연동 옵션

- `PLACE_CONTEXT_EXTERNAL_APIS=true`: 서버에서 외부 공공 API 조회를 켠다. 기본값은 fallback 모드다.
- `KOREA_DATA_API_KEY`: 공공데이터포털 공통 서비스 키 fallback.
- `KMA_SHORT_TERM_SERVICE_KEY`: 기상청 단기예보/초단기예보 조회서비스 키. 없으면 `KOREA_DATA_API_KEY`를 사용한다.
- `TOUR_API_SERVICE_KEY`: 한국관광공사 TourAPI 키. 없으면 `KOREA_DATA_API_KEY`를 사용한다.
- `AIRKOREA_SERVICE_KEY`: 에어코리아 대기오염정보 키. 없으면 `KOREA_DATA_API_KEY`를 사용한다.
- 지역별 공영주차장/관광 자원 수요는 공공 API 형태가 지역별로 달라 현재는 fallback 신호로 제공하며, 베타 운영 데이터가 쌓이면 서버 캐시 테이블과 연결한다.

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
pnpm cap:sync
pnpm cap:sync:ios:local
pnpm cap:sync:android:local
pnpm mobile:sync
```

## iOS/Android 앱 하네스

```bash
CAPACITOR_SERVER_URL=https://your-beta-domain.example pnpm cap:sync
pnpm cap:open:ios
pnpm cap:open:android
```

- 네이티브 하네스는 현재 웹/PWA 화면을 앱 셸 안에서 실행하며, `public/capacitor/index.html`은 원격 URL이 없을 때 보이는 최소 fallback이다.
- 모바일 폭에서는 phone-frame 장식, border, shadow를 제거하고 `100dvh`와 safe-area inset을 사용해 실제 앱 화면처럼 보이게 한다.
- 로컬 검증은 iOS 시뮬레이터는 `pnpm cap:sync:ios:local`, Android 에뮬레이터는 `pnpm cap:sync:android:local`로 개발 서버 URL을 지정해 진행할 수 있다.
- Android `assembleDebug` 빌드에는 로컬 JDK가 필요하다.
- GitHub Actions Android Debug 빌드는 `.github/workflows/android.yml`에서 JDK 21, `pnpm verify`, `pnpm cap:sync:android:local`, `./gradlew assembleDebug` 순서로 검증한다.
- iOS `Info.plist`에는 위치/카메라/사진 보관함 권한 목적 문구가 들어 있고, Android Manifest에는 현장 인증용 위치 권한이 선언되어 있다.
- Apple App Store와 Google Play 정식 제출 전에는 UGC 사용자 차단, 계정 삭제 처리, 위치/사진 권한 문구, 스토어 심사용 계정과 스크린샷을 별도로 준비해야 한다.

출시 전에는 lockfile을 커밋한 뒤 아래 명령까지 통과해야 합니다.

```bash
pnpm install --frozen-lockfile
pnpm audit --audit-level low
```

## 문서

- 테스트 계획: `_workspace/04_test_plan.md`
- 배포 가이드: `_workspace/05_deploy_guide.md`
- QA/Security 리뷰: `_workspace/06_review_report.md`
- 개인정보/위치정보/사진/신고 정책: `docs/privacy-safety-policy.md`
- 보안 게이트: `docs/security-gate.md`
