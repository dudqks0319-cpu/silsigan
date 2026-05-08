# #실시간 보안 게이트 체크리스트

출시 전 이 문서의 P0 항목은 모두 통과해야 한다.

## P0 출시 차단 항목

- [x] `pnpm-lock.yaml`이 생성되어 있고 `pnpm install --frozen-lockfile`이 통과한다.
- [x] `pnpm audit --audit-level low` 결과 known vulnerability가 0건이다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.
- [x] 하드코딩된 API key, service role key, password, token이 없다.
- [x] `SUPABASE_SERVICE_ROLE_KEY`가 브라우저 번들 검색에서 검출되지 않는다.
- [x] 모든 사용자 데이터 테이블에 Supabase RLS가 켜져 있다.
- [x] RLS 정책은 공개 데이터 제한 조회와 본인 민감 데이터 읽기 제한을 정의한다.
- [x] 위치 원본 위도/경도가 DB 스키마에 저장되지 않는다.
- [x] 사진 업로드 검증 seam이 MIME/용량/서명 불일치와 EXIF/GPS 제거 의도를 테스트한다.
- [x] 병원/관공서 카테고리의 민감정보 경고와 제한 정책이 제품에 반영되었다.
- [x] 신고 접수, 우선 숨김 목업 API, 운영자 신고 큐 초안이 동작한다.
- [x] 질문권/포인트 변경은 서버 목업 원장으로 계산하며 client direct DB insert는 RLS에서 열지 않는다.
- [x] 제보/질문/신고 API에 서버 파생 actor 기준 rate limit이 적용되어 있다.
- [x] validation 실패 케이스의 negative-path 테스트가 있다.

## 남은 출시 차단 항목

| 항목 | Owner | Due date |
| --- | --- | --- |
| 실제 이미지 바이너리 재인코딩과 샘플 전후 비교 | FullStackDev | 2026-05-15 |
| 운영자 삭제 처리와 실제 DB/Storage 삭제 연결 | FullStackDev | 2026-05-15 |
| Supabase Auth 세션과 service-role 서버 트랜잭션 실제 DB 연결 | FullStackDev | 2026-05-14 |
| 모바일/데스크톱 브라우저 시각 QA 스크린샷 확보 | DesignMarketing | 2026-05-10 |

## P1 운영 보완 항목

- [x] Rate limit이 제보/질문/신고에 적용되어 있다.
- [ ] 업로드 전용 rate limit이 실제 Storage API에 적용되어 있다.
- [ ] 신고 큐 운영자 알림 채널이 있다.
- [ ] 삭제 SLA와 담당자가 정해져 있다.
- [ ] Storage 파일 삭제와 DB soft delete 정합성 테스트가 있다.
- [ ] Vercel/Supabase 로그 redaction 기준이 문서화되어 있다.
- [ ] 만료된 제보가 지도/홈/장소 상세 요약에서 제외되는지 검증되어 있다.

## 증적 기록

출시 승인 전 아래 결과를 이슈/릴리스 노트에 첨부한다.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level low
```

추가 증적:

- RLS 정책 SQL 또는 Supabase screenshot.
- EXIF 제거 전/후 샘플 검증 결과.
- service role key 브라우저 번들 검색 결과.
- 신고/삭제 시나리오 테스트 결과.
- 병원/관공서 민감정보 경고 화면 캡처.
