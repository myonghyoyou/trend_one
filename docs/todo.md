# 구현 체크리스트

> 계획: `docs/plan.md` (v2, React Pure JS + Spring Boot) 참조.
> 이번 라운드는 **프론트엔드만** 진행. 백엔드(Spring Boot)는 기존에 작업해둔 프로젝트 코드를 기반으로 이후 별도 진행 예정 — 아직 코드 없음.

---

## Phase 1 — 프론트엔드 기반 설정 ✅

- [x] `npm create vite@latest frontend -- --template react` (JavaScript, TypeScript 미사용)
- [x] 추가 패키지: `react-router-dom`, `react-hook-form`, `zod`, `@hookform/resolvers`, `echarts`, `echarts-for-react`, `prop-types`
- [x] Tailwind CSS v4 설정 (`postcss.config.js`, `src/styles/index.css` `@theme` 디자인 토큰 — brand 컬러 스케일 초안)
- [x] Pretendard 폰트 복사 (`frontend/public/fonts/` 4종) + `@font-face` 등록
- [x] `vite.config.js` — dev proxy(`/api` → `localhost:8080`)로 로컬 CORS/SameSite 이슈 회피
- [x] `src/lib/apiClient.js` — fetch 래퍼 (credentials 포함, resCd 공통 처리, 세션 만료 리스너)
- [x] `src/constants/domain.js` — 지역코드, 요일값, 응답코드 등 도메인 상수
- [x] `src/lib/date.js` — 날짜 유틸 (기본값, 범위 계산)

## Phase 2 — 백엔드 기반 설정 ⬜ (보류)

- [ ] 기존에 작업해둔 Spring Boot 프로젝트 코드 확인/이관 필요 — **아직 코드 없음**
- [ ] 이후 라운드에서 `backend/` 스캐폴드 진행 예정

## Phase 3 — 로그인 흐름 ✅ (프론트엔드만)

- [x] `src/lib/apiClient.js` 기반 `/api/auth/login|logout|session` 호출부
- [x] `src/components/auth/LoginForm.jsx` (React Hook Form + Zod)
- [x] `src/components/auth/LogoutButton.jsx`
- [x] `src/pages/LoginPage.jsx`
- [x] `src/hooks/useSessionStatus.js` — `GET /api/auth/session` 기반 세션 확인
- [x] `src/router.jsx` — `RootRedirect`, `PrivateRoute` (세션 가드)
- [ ] **실제 백엔드 연동 검증** — 백엔드 미구현으로 미검증 (Phase 2 완료 후 진행)

## Phase 4 — 공통 UI 컴포넌트 ✅

- [x] `src/context/ModalContext.jsx` — `openAlert`, `openConfirm`
- [x] `src/components/ui/AlertModal.jsx`, `ConfirmModal.jsx` — ESC/backdrop 닫기, 자동 포커스
- [x] `src/components/ui/Loader.jsx` — portal 기반 전체화면 오버레이
- [x] `src/components/ui/Button.jsx`, `Select.jsx` — Tailwind 커스텀 디자인 시스템 (컴포넌트 라이브러리 미사용)
- [x] `src/App.jsx` — `ModalProvider` + `RouterProvider` 루트 조립

## Phase 5 — 정압기 검색 ✅ (프론트엔드만)

- [x] `src/components/dashboard/SearchForm.jsx` — React Hook Form + Zod, 날짜 기본값 오늘-7일/오늘, 30일 범위 검증
- [x] `src/components/dashboard/GovernorTable.jsx` — 체크박스, 최대 3개 선택, 빈 상태 문구
- [x] `src/hooks/useGovernorApi.js` — `searchGovernors`, `fetchGovernorStats`, `uploadGovernorExcel`
- [ ] **실제 검색 동작 검증** — 백엔드 미구현으로 미검증

## Phase 6 — 통계 조회 및 차트 ✅ (프론트엔드만)

- [x] `src/components/dashboard/StatsChart.jsx` — ECharts, `dataZoom`(inside+slider), Y축 1.7–3.0 고정/자동확장
- [x] `src/components/dashboard/DataTable.jsx`
- [x] `src/components/dashboard/SummaryTables.jsx` — MIN/AVG/MAX (프론트엔드 계산)
- [ ] **실제 차트 렌더링 검증** — 백엔드 미구현으로 미검증

## Phase 7 — 엑셀 업로드 + 트랜잭션 ⬜ (프론트엔드 UI만)

- [x] `src/components/dashboard/ExcelUpload.jsx` — 파일 선택 → `FormData` → `/api/crud`
- [ ] 트랜잭션 create/in-progress/rollback — UI 없음 (research.md 2d: 백엔드 전용 기능), 백엔드 구현 대상
- [ ] `docs/references/sample.xlsx` 대조 검증 — 백엔드(Apache POI 파싱) 완료 후 가능

## Phase 8 — 마무리 ⬜

- [x] `src/pages/DashboardPage.jsx` — SearchForm/GovernorTable/StatsChart/DataTable/SummaryTables/ExcelUpload/LogoutButton 전체 조합
- [x] `npm run build`, `npm run lint` 통과 확인
- [ ] 세션 만료 시나리오 E2E — 백엔드 필요
- [ ] 브라우저 실동작 점검 (레이아웃, 반응형, 폰트, 모달, 로더) — 백엔드 없이는 로그인 이후 화면 접근 불가, 목업 데이터로 우선 점검 검토 가능

---

## 다음 라운드 (백엔드 착수 시 진행)

- [ ] 기존에 작업해둔 Spring Boot 프로젝트 코드 확보 후 `backend/`로 이관 또는 신규 스캐폴드 결정
- [ ] `docs/plan.md` 섹션 13 Phase 2 이후 순서대로 진행
- [ ] 백엔드 완성 후 프론트엔드 전 구간 실동작 재검증 (현재 목록의 "미검증" 항목 전체)

## 사전 완료 필요 (구현 전 인간 결정, 여전히 미해결)

- [ ] 로그인 계정 값 결정 (설정값 단일 계정)
- [ ] `gvrnr_mng_sys_app_transaction` 실제 테이블명 운영 DB에서 확인
- [ ] 디자인 토큰(색상/타이포/레이아웃 컨셉) — 현재 임시로 blue 계열 brand 컬러 + slate 뉴트럴로 초안 적용. 확정 아님, 피드백 필요
- [ ] 운영 배포 토폴로지 결정 (동일 도메인 리버스 프록시 vs 완전 분리 도메인)
