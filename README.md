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
- API는 아직 Supabase가 아니라 서버 목업 저장소를 사용한다.
- 질문/물어보기권 차감은 클라이언트 잔액을 신뢰하지 않고 서버 목업 원장으로 판단한다.
- 제보/질문/신고 API에는 기본 rate limit이 들어 있다.
- 위치 권한 실패 시 데모 위치로 현장 인증하지 않고, 인증 없는 제보로 낮은 신뢰도 표시한다.
- 사진 업로드는 파일 input과 서버 검증 seam까지 구현되어 있으며 실제 Storage 저장/이미지 재인코딩은 다음 단계다.
- 관리자 신고 큐 초안은 `/admin/moderation`에 있으며 `ADMIN_MODERATION_TOKEN` 없이는 큐를 공개하지 않는다.
- 지도는 네이버 지도 JavaScript API v3를 사용하며 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 `ncpKeyId` 값을 넣으면 활성화된다.

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
