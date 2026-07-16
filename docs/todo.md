# 구현 체크리스트

> 계획: `docs/plan.md` 참조. 신규 Next.js 프로젝트 경로: `C:\projects\gov-trend-next`

---

## Phase 1 — 프로젝트 기반 설정 ✅

- [x] `create-next-app` (TypeScript, App Router, Tailwind CSS v4, src/ 디렉터리)
- [x] 추가 패키지 설치: `iron-session`, `pg`, `@types/pg`
- [x] Pretendard 폰트 복사 (`src/app/fonts/` 4종: Light/Regular/Medium/SemiBold)
- [x] `src/app/layout.tsx` — Pretendard 로컬 폰트 설정
- [x] `src/app/globals.css` — Tailwind v4 기반 글로벌 스타일
- [x] `src/app/page.tsx` — `/login` 리다이렉트 stub
- [x] `src/types/index.ts` — 공유 타입 정의
- [x] `.env.local` — 환경 변수 템플릿 (실제 값 입력 필요)
- [ ] shadcn/ui 초기화 — Phase 4 시작 전에 진행 예정 (Phase 1-3에서 불필요)

## Phase 2 — 인프라 레이어 ✅

- [x] `src/lib/db.ts` — pg Pool 싱글톤
- [x] `src/lib/query.ts` — `executeQuery` 래퍼 (getOne / getList / execute)
- [x] `src/lib/session.ts` — iron-session 설정 (TTL 5400s)
- [x] `src/proxy.ts` — 세션 검증 proxy (Next.js 16 명칭)

## Phase 3 — 로그인 흐름 ✅

- [x] `src/app/api/auth/login/route.ts`
- [x] `src/app/api/auth/logout/route.ts`
- [x] `src/components/auth/LogoutButton.tsx`
- [x] `src/app/login/page.tsx`
- [x] `src/app/dashboard/page.tsx` (보호된 stub)
- [x] `src/app/page.tsx` — 세션 유무 기반 분기 리다이렉트로 교체
- [x] `src/types/index.ts` — SessionData 업데이트 (`isLoggedIn`, `userId`, `loginAt`)
- [x] `src/proxy.ts` — 세션 체크 필드 수정

## Phase 4 — 공통 UI 컴포넌트 ✅

- [x] shadcn/ui 초기화 — 의도적으로 보류 (plain Tailwind로 충분함, Phase 5 이후 필요 시 추가)
- [x] `src/context/ModalContext.tsx` — ModalProvider, useModal hook
- [x] `src/components/ui/AlertModal.tsx` — ModalContext 연동, ESC/backdrop 닫기, 자동 포커스
- [x] `src/components/ui/ConfirmModal.tsx` — ModalContext 연동, ESC 닫기, 자동 포커스
- [x] `src/components/ui/Loader.tsx` — visible prop, optional message, z-40 오버레이
- [x] `src/app/providers.tsx` — Client 경계 래퍼 (ModalProvider + 모달 마운트)
- [x] `src/app/layout.tsx` — Providers 래퍼 추가
- [x] `src/components/ui/ModalDemoButtons.tsx` — 임시 테스트 컴포넌트 (Phase 5에서 제거)
- [x] `src/app/dashboard/page.tsx` — ModalDemoButtons 포함한 stub으로 업데이트

## Phase 5 — 정압기 검색 ✅

- [x] `src/app/api/governors/list/route.ts` — Zod 검증 + 파라미터화 SQL (AS-IS 재현)
- [x] `src/components/dashboard/SearchForm.tsx` — React Hook Form + Zod, 날짜 기본값 오늘-7일/오늘
- [x] `src/components/dashboard/GovernorTable.tsx` — 체크박스, 최대 3개 선택, 빈 상태
- [x] `src/components/dashboard/DashboardContent.tsx` (신규) — Client Component 상태 보유
- [x] `src/hooks/useGovernorApi.ts` — API 호출 훅 (searchGovernors)
- [x] `src/app/dashboard/page.tsx` — ModalDemoButtons 제거, DashboardContent 통합
- [x] `src/types/index.ts` — GovernorSearchFormValues, GovernorListRequest, GovernorListResponse 추가
- [x] `.env.local` — LOGIN_PASSWORD 값을 따옴표로 감싸 # 주석 처리 문제 수정

## Phase 6 — 통계 조회 및 차트 ⬜

- [ ] `src/app/api/governors/stats/route.ts`
- [ ] `src/components/dashboard/StatsChart.tsx`
- [ ] `src/components/dashboard/DataTable.tsx`
- [ ] `src/components/dashboard/SummaryTables.tsx`

## Phase 7 — 엑셀 업로드 + 트랜잭션 ⬜

- [ ] 추가 패키지: `exceljs`, `react-hook-form`, `zod`, `@hookform/resolvers`
- [ ] `src/lib/excel-parser.ts`
- [ ] `src/app/api/crud/route.ts`
- [ ] `src/app/api/transactions/create/route.ts`
- [ ] `src/app/api/transactions/in-progress/route.ts`
- [ ] `src/app/api/transactions/rollback/route.ts`

## Phase 8 — 마무리 ⬜

- [ ] 전체 컴포넌트 조합 최종 검증
- [ ] 세션 만료 시나리오 E2E 테스트
- [ ] 브라우저 UI 최종 점검 (레이아웃, 1280px, 폰트, 모달, 로더)

---

## 사전 완료 필요 (구현 전 인간 결정)

- [ ] `.env.local` 실제 값 입력 (DB 연결정보, SESSION_SECRET, LOGIN_ID, LOGIN_PASSWORD)
- [ ] `gvrnr_mng_sys_app_transaction` 실제 테이블명 운영 DB에서 확인
- [ ] Phase 7 시작 전 `docs/references/sample.xlsx` 실제 파싱 검증
