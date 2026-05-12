# #실시간

위치 기반 실시간 현장 제보 MVP입니다. 사용자는 현재 위치 주변의 사진과 현장 상태를 제보하고, 다른 사용자는 궁금한 장소의 현재 상황을 질문할 수 있습니다.

## MVP 범위

- 웹/PWA 우선
- Next.js + Supabase + Vercel
- 초기 지역: 울산, 부산, 경주
- 초기 카테고리: 관광지, 축제/행사장, 맛집/카페, 병원, 관공서, 주차장
- MVP 제외: 결제, 현금성 포인트, DM, 팔로우, 업체 광고, 네이티브 앱, AI 자동 판독

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
- 사진 업로드는 `sharp`로 JPEG 재인코딩하고 원본 파일명/EXIF/GPS 저장을 피한 뒤 Supabase Storage에 UUID 경로로 저장한다.
- 24시간 이상 제보에 연결되지 않은 사진 업로드를 정리하는 관리자 API가 있다.
- 관리자 신고 큐는 `/admin/moderation`에 있으며 `ADMIN_MODERATION_TOKEN` 없이는 큐와 cleanup API를 공개하지 않는다.
- 신고 숨김 처리 시 Storage 사진 삭제와 처리 로그 저장 흐름을 제공한다.
- 지도는 네이버 지도 JavaScript API v3를 사용하며 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 `ncpKeyId` 값을 넣으면 활성화된다.
- 홈은 검색, 방금 올라온 현장, 사진 없는 상태 제보, 지금 많이 확인하는 곳, 답변 가능한 질문 중심의 한국 웹 베타 UX로 구성되어 있다.
- 공유는 Web Share API를 우선 사용하고, 미지원 브라우저는 클립보드 복사 또는 수동 복사 모달로 fallback한다.
- 공유 URL은 `/share/[placeId]`에서 카카오톡/OG 메타를 제공한 뒤 `/?place=...&from=share`로 앱 장소 상세 진입을 유도한다.

## 개발 명령

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

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
