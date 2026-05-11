# Live Feed UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the #실시간 beta UX around search, live photo/status feed, internal popular places, stronger place detail actions, and clearer answer rewards.

**Architecture:** Keep the existing single prototype component and CSS token structure. Add focused helper functions inside `SilsiganPrototype.tsx` for popular ranking and report presentation, then expand copy-level tests in `tests/ux-copy.test.ts`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS, node:test.

---

### File Structure

- Modify: `src/components/silsigan/SilsiganPrototype.tsx`
  - Add recommended search chips, split photo/status report rendering, popular place ranking, navigation CTA copy, and stronger answer completion text.
- Modify: `src/app/globals.css`
  - Add styles for search chips, status report cards, popular place cards, navigation CTA row, and compact reward chips.
- Modify: `tests/ux-copy.test.ts`
  - Assert the beta UX copy and key class names remain present.

### Task 1: Lock UX Copy Tests

- [ ] Add assertions for `추천 검색어`, `사진 없는 상태 제보`, `지금 많이 확인하는 곳`, `카카오내비로 길찾기`, `티맵으로 길찾기`, and answer completion copy.
- [ ] Run `npm test` and confirm the new test fails before implementation if any copy is absent.

### Task 2: Implement Home Live Feed

- [ ] Add search recommendation chips below the search box.
- [ ] Render photo reports in the featured card only when a report has `photoUrl`.
- [ ] Render photo-less reports as status cards with people, line, parking, and trust labels.
- [ ] Add `getPopularPlaces` to rank places by recent reports, questions, pending answers, and photo reports.
- [ ] Add a `지금 많이 확인하는 곳` section using the ranked places.

### Task 3: Strengthen Place Detail

- [ ] Reword the detail summary as a current decision panel.
- [ ] Keep the trust metrics card near the top.
- [ ] Add navigation CTA buttons for Kakao Navi and TMAP as external-intent buttons without adding third-party SDK dependencies.
- [ ] Keep the existing question/report sticky actions.

### Task 4: Tighten Report And Answer Feedback

- [ ] Compress reward policy visual copy while keeping the full policy meaning.
- [ ] Make answer completion toast include `질문자에게 전달됐습니다`.
- [ ] Keep unverified answer reward blocked.

### Task 5: Verify

- [ ] Run `npm test`.
- [ ] Run `pnpm verify`.
- [ ] Review `git diff --check`.
