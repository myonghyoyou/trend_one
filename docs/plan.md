# docs/plan.md — 정압기 관리 시스템: Next.js 마이그레이션 구현 계획 (1차 마일스톤)

> 이 계획은 `docs/research.md` 와 `docs/references/db_schema.md` 를 출처로 사용한다.
> 확인된 인간 결정사항은 섹션 16에 기록되어 있으며, 이 계획 전체에 반영되었다.
> 구현은 인간의 명시적 승인 이후에만 시작한다.

---

## 1. 마이그레이션 목표

- Django 4.0.5 기반 정압기 관리 시스템을 **Next.js App Router (TypeScript)** 기반으로 재구축한다.
- 기존 PostgreSQL 데이터베이스와 테이블 스키마는 **변경하지 않는다.**
- **1차 마일스톤 인증:** Hyperion SSO 연동은 보류. 대신 **ID/비밀번호 로그인 화면**으로 대체한다.
- 모든 raw SQL f-string 보간을 **파라미터화 쿼리로 전면 교체**하여 SQL Injection을 제거한다.
- 기존 기능의 동작 방식을 충실히 재현하되, 새 기술 스택의 강점(타입 안전성, 컴포넌트 재사용성)을 활용한다.
- **Rollback 기능을 정상 동작하도록 재구현한다.** (기존 Django 코드는 비동작 상태)
- 1차 마일스톤은 **단독으로 배포 가능한 완성된 앱**으로 마무리한다.

---

## 2. 현재 프로젝트에서 가져가야 할 핵심 구조

### 반드시 동일하게 유지해야 하는 항목

| 항목 | 이유 |
|---|---|
| 응답 코드 체계 (`resCd: "0000"/"0001"/"0002"`) | 클라이언트 공통 처리 패턴 유지 |
| 지역 코드 (`"3100"` 경기, `"1100"` 서울) | `t_region_cd.cate_cd` FK 값 |
| 점검 요일 값 (MON/TUE/WED/THU/FRI) | `t_governor.inspct_day` 컬럼 저장값 |
| 엑셀 컬럼 형식 (`"지역.정압기명"`, `.` 구분) | 외부 데이터 제공자 정의 형식 |
| `generate_series()` 쿼리 로직 | 현재 동작 방식 그대로 복제 (재설계 미포함) |
| 세션 TTL 90분 슬라이딩 윈도우 | 기존 UX 유지 |
| DB 컬럼명 (db_schema.md 기준) | 기존 운영 스키마 변경 없음 |

### 재구현 방식으로 개선하는 항목

| 기존 방식 | 개선 방향 |
|---|---|
| Hyperion SSO + DES-CBC 인증 | ID/비밀번호 로그인 (1차 마일스톤) |
| raw SQL f-string 보간 (SQL Injection) | 파라미터화 쿼리 (`$1`, `$2`, ...) 전면 교체 |
| Django uWSGI 세션 | `iron-session` httpOnly 쿠키 |
| 비동작 Rollback (Gvrnr_model.objects 오류) | `Transaction.data` JSONField 기반 정상 동작 Rollback |
| jQuery + FormData AJAX | React state + `fetch` API |
| Bootstrap 5 + 로컬 번들 | Tailwind CSS + shadcn/ui |
| CDN ECharts + 커스텀 스크롤 JS | `echarts-for-react` + 네이티브 `dataZoom` |
| pandas 엑셀 파싱 | `exceljs` (Node.js 서버 측) |
| 로그아웃: DOM 숨김만 처리 | 서버 세션 삭제 + 클라이언트 리다이렉트 |

### 제거하는 항목 (데드 코드 확인)

- `hidden.html` 의 `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type` — 어떤 뷰에서도 사용되지 않음. 마이그레이션 제외.
- `"TEST"` bypass — 제거. 로컬 개발은 로그인 화면으로 진행.

---

## 3. Next.js 기반 제안 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  브라우저 (Client)                                          │
│  - React Client Components                                  │
│  - ECharts (echarts-for-react)                              │
│  - fetch() → Next.js API 라우트                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (JSON / FormData)
┌──────────────────────▼──────────────────────────────────────┐
│  Next.js App Router (서버)                                  │
│  ├── /login          → 로그인 페이지 (1차 마일스톤 진입점)  │
│  ├── /dashboard      → Server Component 래퍼               │
│  │   └── 하위 컴포넌트들 → Client Components               │
│  └── /api/**         → Route Handlers (Node.js 서버 측)    │
│       ├── /api/auth/login       (로그인 — 세션 설정)        │
│       ├── /api/auth/logout      (로그아웃 — 세션 삭제)      │
│       ├── /api/governors/list   (정압기 검색)               │
│       ├── /api/governors/stats  (통계 조회)                 │
│       ├── /api/crud             (엑셀 업로드)               │
│       └── /api/transactions/**  (트랜잭션 관리 + 롤백)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ node-postgres (pg)
┌──────────────────────▼──────────────────────────────────────┐
│  PostgreSQL (기존 DB — 스키마 변경 없음)                    │
│  - t_mbr                     (회원 정보)                    │
│  - t_governor                (정압기 마스터)                │
│  - t_governor_stat           (측정 트렌드)                  │
│  - t_region_cd               (지역 코드)                    │
│  - t_file_upload_log         (업로드 이력)                  │
│  - gvrnr_mng_sys_app_transaction  (Django 트랜잭션 테이블)  │
└─────────────────────────────────────────────────────────────┘
```

**핵심 아키텍처 결정:**
- **ORM 없음.** raw SQL 직접 사용, 파라미터화 쿼리(`$1`, `$2`)로 작성.
- **별도 백엔드 서비스 없음.** Next.js Route Handler → DB 직접 접근.
- **전역 상태 라이브러리 없음.** Dashboard 레벨 `useState` + `useReducer` 로 충분.
- **모달 전역 제공:** AlertModal, ConfirmModal → `ModalContext` (React Context).
- **Hyperion SSO:** 1차 마일스톤 범위 밖. 별도 마일스톤에서 연동 예정.

---

## 4. 초기 폴더 구조

```
gov-trend-next/               # 새 Next.js 프로젝트 루트 (별도 디렉토리)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 루트 레이아웃 (폰트, Tailwind, Modal Provider)
│   │   ├── page.tsx                   # / → /dashboard 또는 /login 리다이렉트
│   │   ├── login/
│   │   │   └── page.tsx               # 로그인 페이지 (1차 마일스톤 인증 진입점)
│   │   ├── dashboard/
│   │   │   └── page.tsx               # 메인 대시보드 (main.html 대체)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts       # POST — 자격증명 검증 + iron-session 설정
│   │       │   └── logout/
│   │       │       └── route.ts       # POST — iron-session 삭제
│   │       ├── governors/
│   │       │   ├── list/
│   │       │   │   └── route.ts       # POST /getGvrnrList/
│   │       │   └── stats/
│   │       │       └── route.ts       # POST /getGvrnrStats/
│   │       ├── crud/
│   │       │   └── route.ts           # POST /gvrnrCRUD/ (multipart)
│   │       └── transactions/
│   │           ├── create/
│   │           │   └── route.ts       # POST /createTransaction/
│   │           ├── in-progress/
│   │           │   └── route.ts       # POST /getTransactionsInProgress/
│   │           └── rollback/
│   │               └── route.ts       # POST — 정상 동작 롤백
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx          # 로그인 폼 (Client)
│   │   ├── dashboard/
│   │   │   ├── SearchForm.tsx         # 검색 필터 폼 (Client)
│   │   │   ├── GovernorTable.tsx      # 정압기 목록 테이블 + 체크박스 (Client)
│   │   │   ├── StatsChart.tsx         # ECharts 라인 차트 (Client)
│   │   │   ├── DataTable.tsx          # 측정 데이터 테이블 (Client)
│   │   │   └── SummaryTables.tsx      # MIN/AVG/MAX 요약 테이블 (Client)
│   │   └── ui/
│   │       ├── Loader.tsx             # 전체 화면 로딩 오버레이 (Client)
│   │       ├── AlertModal.tsx         # Alert 모달 (Client)
│   │       └── ConfirmModal.tsx       # Confirm 모달 (Client)
│   ├── context/
│   │   └── ModalContext.tsx           # AlertModal / ConfirmModal 전역 Context
│   ├── hooks/
│   │   └── useGovernorApi.ts          # 정압기 API 호출 훅
│   ├── lib/
│   │   ├── db.ts                      # pg Pool 설정 및 싱글톤
│   │   ├── query.ts                   # executeQuery 래퍼 (getOne / getList / execute)
│   │   └── session.ts                 # iron-session 설정 (TTL 5400s, httpOnly)
│   ├── types/
│   │   └── index.ts                   # 공유 TypeScript 타입 정의
│   └── middleware.ts                  # /dashboard, /api/** 세션 유효성 검사
├── public/
│   └── fonts/                         # Pretendard 폰트 파일 (woff, 4종)
├── .env.local                         # DB 연결정보, SESSION_SECRET, LOGIN_ID, LOGIN_PASSWORD
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**구 plan.md 대비 변경 사항:**
- `auth/page.tsx` → `login/page.tsx` (SSO 릴레이 → 로그인 폼)
- `api/auth/session/` → `api/auth/login/` + `api/auth/logout/` 분리
- `lib/des-decrypt.ts` 제거 (1차 마일스톤 범위 밖)
- `components/auth/LoginForm.tsx` 추가
- `HelpModal.tsx` 제외 (PDF 매뉴얼 미준비)
- `public/resource/manual/` 제외

---

## 5. 라우팅 전략

### 페이지 라우트

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `app/page.tsx` | 세션 유무에 따라 `/dashboard` 또는 `/login` 으로 서버 리다이렉트 |
| `/login` | `app/login/page.tsx` | ID/비밀번호 로그인 폼. 인증 성공 시 `/dashboard` 로 이동 |
| `/dashboard` | `app/dashboard/page.tsx` | 세션 필수. 미인증 시 `/login` 으로 리다이렉트 |

### API 라우트

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/auth/login` | POST | 자격증명 검증 + iron-session 설정 |
| `/api/auth/logout` | POST | iron-session 삭제 |
| `/api/governors/list` | POST | 정압기 검색 (기존 `/getGvrnrList/`) |
| `/api/governors/stats` | POST | 통계 조회 (기존 `/getGvrnrStats/`) |
| `/api/crud` | POST | 엑셀 업로드 (기존 `/gvrnrCRUD/`) |
| `/api/transactions/create` | POST | 트랜잭션 생성 |
| `/api/transactions/in-progress` | POST | 진행 중 트랜잭션 목록 |
| `/api/transactions/rollback` | POST | 전체 롤백 (정상 동작, URL 오타 수정) |

### 미들웨어 (`middleware.ts`)

- `/dashboard` 와 `/api/governors/**`, `/api/crud`, `/api/transactions/**` 에 접근 시 iron-session 쿠키를 검사한다.
- 유효하지 않으면 API 라우트는 `{ resCd: "0002", resMsg: "세션이 만료되었습니다." }` 반환, 페이지는 `/login` 으로 리다이렉트.
- `/api/auth/login`, `/api/auth/logout` 은 미들웨어 대상 제외.

---

## 6. API 레이어 전략

### 데이터베이스 접근

- **`node-postgres` (`pg`) 직접 사용.** ORM 없음.
- DB 연결은 `src/lib/db.ts` 에서 `Pool` 싱글톤으로 관리.
- 모든 쿼리는 `$1`, `$2` 파라미터 바인딩. f-string 보간 금지.
- DB 스키마는 `docs/references/db_schema.md` 기준으로 컬럼명/타입 사용.

```typescript
// src/lib/query.ts 핵심 인터페이스
type ReturnType = "getOne" | "getList" | "execute";
async function executeQuery<T>(sql: string, params: unknown[], returnType: ReturnType): Promise<T>
```

### API 라우트별 처리 방식

**`POST /api/auth/login`**
1. `FormData` 에서 `login_id`, `password` 수신
2. `LOGIN_ID`, `LOGIN_PASSWORD` 환경 변수와 비교
3. 일치하면 `t_mbr` 에서 해당 `mbr_uid` 존재 여부 확인 (선택적 — 섹션 16 참고)
4. iron-session 으로 `{ mbr_uid, session_exists: true }` 세션 설정
5. 응답: `{ resCd: "0000" }` 또는 실패 시 `{ resCd: "0001", resMsg: "아이디 또는 비밀번호가 올바르지 않습니다." }`

**`POST /api/auth/logout`**
1. `session.destroy()` 로 iron-session 쿠키 삭제
2. 응답: `{ resCd: "0000" }` → 클라이언트는 `/login` 으로 리다이렉트

**`POST /api/governors/list`**
1. 세션 검증 (미들웨어)
2. `startDate`, `endDate`, `inspctDay`, `srchCity`, `srchCntnt` 수신
3. `db_schema.md` 기준 컬럼명(`gvrnr_uid`, `gvrnr_nm`, `inspct_day`, `cate_cd`, `cd_name`) 사용
4. 기존 SQL 파라미터화 쿼리로 재작성
5. 응답: `{ resCd: "0000", gvrnrList: [{ gvrnr_uid, gvrnr_nm, inspct_day, gvrnr_stat_cnt, cd_name }] }`

**`POST /api/governors/stats`**
1. `gvrnrUids`(쉼표 구분), `gvrnrNms`, `startDate`, `endDate`, `intervalNum` 수신
2. 기존 `getGvrnrStats` SQL (`generate_series()` 포함) 파라미터화 쿼리로 재작성
3. UID 목록: `= ANY($1::text[])` 패턴으로 처리
4. `db_schema.md` 기준 컬럼명(`gvrnr_press1`, `gvrnr_press2`, `gvrnr_trnsps1`, `gvrnr_trnsps2`, `record_dttm`) 사용
5. 응답: `{ resCd: "0000", xAxisList: [...], statDataObj: {...} }`

**`POST /api/crud`**
1. `request.formData()` 로 multipart 수신
2. `exceljs` 로 `.xlsx` 파일 파싱
3. `gvrnr_mng_sys_app_transaction` 에 `status="pending"` 트랜잭션 생성
4. pg `BEGIN` 트랜잭션 내에서:
   - 시트별: 지역/정압기명 파싱 → `t_governor` 조회 → 없으면 INSERT (새 uid 목록 추적) → `t_governor_stat` DELETE 후 INSERT
   - `t_file_upload_log` 에 로그 기록 (`mbr_uid`, `success_yn`, `file_name`, 감사 컬럼)
5. 트랜잭션 `data` 컬럼 업데이트: `{ new_gvrnr_uids: [...], updated_gvrnr_uids: [...] }`
6. 성공 시 `status="completed"`, 실패 시 pg `ROLLBACK` + `status="failed"`
7. 응답: `{ resCd: "0000"|"0001"|"0002", resMsg: "..." }`

**`POST /api/transactions/rollback`**
1. 세션 검증
2. `gvrnr_mng_sys_app_transaction` 에서 `status IN ('pending', 'in_progress')` 인 트랜잭션 조회
3. 없으면: `{ resCd: "0000", message: "No transactions to rollback" }` 반환
4. pg `BEGIN` 내에서:
   - 각 트랜잭션의 `data->>'new_gvrnr_uids'` + `data->>'updated_gvrnr_uids'` 수집
   - `DELETE FROM t_governor_stat WHERE gvrnr_uid = ANY($1::text[])` (전체 영향 uid)
   - `DELETE FROM t_governor WHERE gvrnr_uid = ANY($1::text[])` (신규 삽입 uid만)
   - `UPDATE gvrnr_mng_sys_app_transaction SET status='rolled_back', updated_at=NOW() WHERE id = ANY($2)`
5. `pg COMMIT`
6. 응답: `{ resCd: "0000" }`

> **롤백 한계:** `updated_gvrnr_uids` (기존 정압기의 통계 교체) 의 경우 새 통계는 삭제되지만 이전 통계는 복원 불가. 기존 정압기 마스터 레코드(`t_governor` 행)는 보존된다. 이 한계는 코드 주석으로 명시한다.

### Django Transaction 테이블 스키마 (`gvrnr_mng_sys_app_transaction`)

`0001_initial.py` 에서 확인한 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BigInteger (PK) | 자동 증가 |
| `transaction_id` | UUID (unique) | 외부 식별자 |
| `status` | varchar(50) | pending / in_progress / completed / rolled_back / failed |
| `data` | jsonb | 영향받은 gvrnr_uid 목록 저장 |
| `created_at` | timestamp | 생성일시 |
| `updated_at` | timestamp | 수정일시 |

### 엑셀 파싱 (`src/lib/excel-parser.ts`)

- `exceljs` 패키지 사용
- 파싱 가정 (코드 분석 기반, Phase 7에서 `docs/references/sample.xlsx` 대조 검증):
  - 시트명: 한국어 요일 (화요일, 수요일, ...)
  - 0번 컬럼: datetime
  - 나머지 컬럼 헤더: `"지역.정압기명"` (`.` 으로 분리)
  - 지역 판별: 컬럼명에 `"경기"` 포함 → `cate_cd = "3100"`, 아니면 `"1100"` (서울)
- `db_schema.md` 기준: insert 시 `gvrnr_press1`, `gvrnr_press2`, `gvrnr_trnsps1`, `gvrnr_trnsps2`, `record_dttm` 컬럼 사용

---

## 7. 인증/권한 처리 전략

### 1차 마일스톤: ID/비밀번호 로그인

**흐름:**
```
사용자 → /login 페이지
  → ID + 비밀번호 입력 → POST /api/auth/login
  → 서버: .env.local의 LOGIN_ID / LOGIN_PASSWORD 와 비교
  → 일치 시: iron-session 설정 → /dashboard 로 이동
  → 불일치 시: 오류 메시지 표시
```

**구현 세부사항:**
- iron-session 쿠키: `{ cookieName: "gov-trend-session", password: SESSION_SECRET, cookieOptions: { secure: true, httpOnly: true, maxAge: 5400 } }`
- 세션 데이터: `{ mbr_uid: string, session_exists: true }`
- 슬라이딩 윈도우: 각 API 라우트 처리 후 `session.save()` 재호출
- 로그아웃: `POST /api/auth/logout` → `session.destroy()` → 클라이언트 `/login` 리다이렉트

**인증 자격증명 방식:**
- `.env.local` 에 `LOGIN_ID`, `LOGIN_PASSWORD` 환경 변수로 정의
- 이는 1차 마일스톤용 임시 방식. 추후 `t_mbr` 기반 다중 사용자 인증으로 전환 예정
- `t_mbr` 에 비밀번호 컬럼이 없으므로 현재는 단일 계정 방식으로 운영

> **주의:** `t_mbr` 에는 비밀번호 컬럼이 존재하지 않는다 (`docs/references/db_schema.md` 확인). 다중 사용자 개별 비밀번호 인증은 DB 스키마 변경이 필요하므로 1차 마일스톤 범위 밖이다.

**미래 SSO 연동 (2차 마일스톤 예정):**
- Hyperion SSO → DES-CBC(key=IV=`b'h2h0i1c5'`) 복호화 → iron-session 방식 구현
- `userId` 필드명으로 수신 (확인된 값)
- 이 시점에 `lib/des-decrypt.ts` 추가 및 `/auth` (SSO 릴레이) 페이지 구현

**권한/역할:** 없음. 단일 사용자 유형. 세션 존재 여부만 확인.

### `LoginForm` 컴포넌트 동작

- ID/비밀번호 입력 폼 (React Hook Form)
- POST `/api/auth/login` 호출
- 성공: `router.push('/dashboard')`
- 실패: 오류 메시지 인라인 표시 (모달 없이 폼 내 표시)
- 세션이 이미 있는 경우 `/dashboard` 로 자동 리다이렉트

---

## 8. 상태 관리 전략

전역 상태 라이브러리(Zustand, Redux) 없음. Dashboard 페이지 레벨 React state 로 충분.

### 상태 매핑

| 기존 변수 | Next.js 대응 | 위치 |
|---|---|---|
| `PROC_CHK` 문자열 플래그 | `loading: boolean` | `dashboard/page.tsx` |
| `gvrnrUids` / `gvrnrNms` | `selectedGovernors: Governor[]` | `dashboard/page.tsx` |
| `press2Data` / `press2ChartData` | `statsData: StatsResponse \| null` | `dashboard/page.tsx` |
| `myChart` ECharts 인스턴스 | `chartRef: React.RefObject<ECharts>` | `StatsChart.tsx` |
| `xAxisList` | `statsData.xAxisList` 에서 파생 | `StatsChart.tsx` |
| `chkboxCnt` (최대 3 선택) | `selectedGovernors.length >= 3` 으로 파생 | `GovernorTable.tsx` |
| 검색 폼 값 | React Hook Form `watch()` | `SearchForm.tsx` |

### 컴포넌트 간 데이터 흐름

```
dashboard/page.tsx  (state 최상위)
  ├── SearchForm.tsx        → onSearch(formData) 콜백
  ├── GovernorTable.tsx     → governors, onSelect(uid, nm) 콜백
  ├── StatsChart.tsx        → statsData, xAxisList
  ├── DataTable.tsx         → statsData
  └── SummaryTables.tsx     → statsData
```

**Alert/Confirm 모달:** `ModalContext` (React Context) 로 `openAlert(msg, type)`, `openConfirm(msg, onOk)` 어디서든 호출 가능.

---

## 9. Form 처리 전략

### 라이브러리: React Hook Form + Zod

**LoginForm 스키마:**
```typescript
const loginSchema = z.object({
  login_id: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});
```

**SearchForm 스키마:**
```typescript
const searchSchema = z.object({
  startDate: z.string(),
  endDate:   z.string(),
  srchCity:  z.enum(["3100", "1100"]).optional(),
  inspctDay: z.enum(["MON", "TUE", "WED", "THU", "FRI"]).optional(),
  srchCntnt: z.string()
    .refine(v => !/[~!@#$%^&*()_+|<>?:{}]/.test(v), "특수문자를 사용할 수 없습니다.")
    .optional(),
}).refine(
  data => dateDiffDays(data.startDate, data.endDate) <= 30,
  { message: "날짜 범위는 최대 30일입니다.", path: ["endDate"] }
);
```

**파일 업로드:**
- `<input type="file" accept=".xlsx,.xls">` + `onChange` 핸들러
- 선택 즉시 `FormData` 구성 → `fetch('/api/crud', { method: 'POST', body: formData })`

**제거된 항목 (데드 코드):**
- `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type` — 마이그레이션에서 완전 제외

---

## 10. 공통 UI/Component 전략

### 컴포넌트 라이브러리: shadcn/ui + Tailwind CSS

| 기존 컴포넌트 | Next.js 대안 | 비고 |
|---|---|---|
| Bootstrap 5 Alert 모달 | `AlertModal.tsx` (shadcn Dialog 기반) | `openAlert(msg, succYn, callback)` 인터페이스 유지 |
| Bootstrap 5 Confirm 모달 | `ConfirmModal.tsx` (shadcn Dialog 기반) | `openConfirm(msg, okCallback)` 인터페이스 유지 |
| jQuery 로더 오버레이 | `Loader.tsx` (React portal + CSS backdrop) | |
| ECharts (CDN) | `echarts-for-react` 또는 `useEffect` + `echarts.init` | 아래 참조 |
| Bootstrap 그리드 | Tailwind CSS grid/flex | |
| Pretendard 폰트 | `next/font/local` | `public/fonts/` 에 `.woff` 파일 복사 |
| Bootstrap Dropdown | shadcn `Select` | 간격 선택 `#interval-sel` 용도 |
| 로그인 폼 | `LoginForm.tsx` (신규) | ID + 비밀번호 입력, React Hook Form |

**1차 마일스톤에서 제외:**
- `HelpModal.tsx` — PDF 매뉴얼 미준비. 별도 추가 예정.

### ECharts 통합 전략

- 기존 `chart_handle.js` 커스텀 스크롤/터치 코드를 ECharts 네이티브 `dataZoom` 으로 대체
- `dataZoom: [{ type: "inside" }, { type: "slider" }]` 로 내장 처리
- Y축 범위 1.7–3.0 고정 (데이터 초과 시 자동 확장) 유지
- 최대 3개 시리즈 동시 표시 유지
- `useRef` + `useEffect` 로 ECharts 인스턴스 관리

### CSS / 레이아웃 전략

- 기존 `main.css` 레이아웃(헤더 6%, 메인 94%, 2컬럼)을 Tailwind 클래스로 재현
- 반응형 브레이크포인트 `@1280px` → Tailwind `xl:` 접두사
- 로더 오버레이 → Tailwind `fixed inset-0 bg-black/75`
- Pretendard 폰트 파일: 기존 `static/css/fonts/Pretendard-*.woff` 4종을 `public/fonts/` 로 복사

---

## 11. 1차 구현 마일스톤 범위

### 포함 (Must Have)

1. Next.js 프로젝트 초기 설정 (TypeScript, Tailwind CSS, App Router, shadcn/ui)
2. Pretendard 폰트 (`next/font/local`)
3. pg Pool 연결 (`lib/db.ts`, `lib/query.ts`)
4. iron-session 세션 관리 (`lib/session.ts`)
5. 미들웨어 (`middleware.ts`) — 세션 검증
6. `LoginForm` 컴포넌트 (React Hook Form + Zod)
7. `/login` 페이지
8. `POST /api/auth/login` — 자격증명 검증 + 세션 설정
9. `POST /api/auth/logout` — 세션 삭제
10. `/dashboard` 페이지 래퍼
11. `SearchForm` 컴포넌트 (React Hook Form + Zod)
12. `GovernorTable` 컴포넌트 (체크박스, 최대 3개 선택)
13. `POST /api/governors/list` Route Handler
14. `StatsChart` 컴포넌트 (ECharts + dataZoom)
15. `DataTable` 컴포넌트
16. `SummaryTables` 컴포넌트 (MIN/AVG/MAX)
17. `POST /api/governors/stats` Route Handler
18. `src/lib/excel-parser.ts` (exceljs 기반)
19. `POST /api/crud` Route Handler (트랜잭션 추적 포함)
20. `POST /api/transactions/create|in-progress` Route Handler
21. `POST /api/transactions/rollback` Route Handler (정상 동작)
22. `Loader` 컴포넌트
23. `AlertModal` / `ConfirmModal` 컴포넌트 + `ModalContext`
24. `.env.local` 설정 (DB 연결, SESSION_SECRET, LOGIN_ID, LOGIN_PASSWORD)

### 제외 (1차 마일스톤 명시적 범위 밖)

섹션 17 참고.

---

## 12. 변경/생성 대상 파일 목록

> 새 Next.js 프로젝트는 별도 디렉토리에 생성. 기존 Django 프로젝트 파일은 수정하지 않는다.

### 설정 파일

- `package.json`
- `next.config.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `components.json` (shadcn/ui)
- `.env.local` — `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `LOGIN_ID`, `LOGIN_PASSWORD`

### 앱 라우트

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/governors/list/route.ts`
- `src/app/api/governors/stats/route.ts`
- `src/app/api/crud/route.ts`
- `src/app/api/transactions/create/route.ts`
- `src/app/api/transactions/in-progress/route.ts`
- `src/app/api/transactions/rollback/route.ts`

### 컴포넌트

- `src/components/auth/LoginForm.tsx`
- `src/components/dashboard/SearchForm.tsx`
- `src/components/dashboard/GovernorTable.tsx`
- `src/components/dashboard/StatsChart.tsx`
- `src/components/dashboard/DataTable.tsx`
- `src/components/dashboard/SummaryTables.tsx`
- `src/components/ui/Loader.tsx`
- `src/components/ui/AlertModal.tsx`
- `src/components/ui/ConfirmModal.tsx`

### 공통 모듈

- `src/context/ModalContext.tsx`
- `src/hooks/useGovernorApi.ts`
- `src/lib/db.ts`
- `src/lib/query.ts`
- `src/lib/session.ts`
- `src/lib/excel-parser.ts`
- `src/types/index.ts`
- `src/middleware.ts`

### 퍼블릭 자산

- `public/fonts/Pretendard-Light.woff`
- `public/fonts/Pretendard-Medium.woff`
- `public/fonts/Pretendard-Regular.woff`
- `public/fonts/Pretendard-SemiBold.woff`
  (기존 `static/css/fonts/` 에서 복사)

---

## 13. 구현 순서

### Phase 1 — 프로젝트 기반 설정

1. `create-next-app` (TypeScript, App Router, Tailwind CSS, src/ 디렉토리)
2. shadcn/ui 초기화, 필요 컴포넌트 설치
3. `next/font/local` 으로 Pretendard 폰트 설정 (woff 4종 복사)
4. `src/types/index.ts` — 공유 타입 정의 (`Governor`, `StatsData`, `ApiResponse`, `SessionData` 등)
5. `.env.local` 작성 (DB 연결, SESSION_SECRET, LOGIN_ID, LOGIN_PASSWORD)

### Phase 2 — 인프라 레이어

6. `src/lib/db.ts` — pg Pool 싱글톤
7. `src/lib/query.ts` — `executeQuery` 래퍼 (getOne / getList / execute)
8. `src/lib/session.ts` — iron-session 설정
9. `src/middleware.ts` — 세션 검증 미들웨어

### Phase 3 — 로그인 흐름

10. `src/app/api/auth/login/route.ts` — 자격증명 검증 + 세션 설정
11. `src/app/api/auth/logout/route.ts` — 세션 삭제
12. `src/components/auth/LoginForm.tsx`
13. `src/app/login/page.tsx`
14. `src/app/page.tsx` — 루트 리다이렉트

> **검증 포인트:** 올바른 ID/비밀번호 → `/dashboard` 이동. 틀린 자격증명 → 오류 메시지. 세션 없이 `/dashboard` 직접 접근 → `/login` 리다이렉트. 로그아웃 → 세션 삭제 후 `/login` 이동.

### Phase 4 — 공통 UI 컴포넌트

15. `src/context/ModalContext.tsx`
16. `src/components/ui/AlertModal.tsx`
17. `src/components/ui/ConfirmModal.tsx`
18. `src/components/ui/Loader.tsx`
19. `src/app/layout.tsx` — ModalContext Provider 적용

### Phase 5 — 정압기 검색

20. `src/app/api/governors/list/route.ts`
21. `src/components/dashboard/SearchForm.tsx`
22. `src/components/dashboard/GovernorTable.tsx`
23. `src/app/dashboard/page.tsx` — SearchForm + GovernorTable 조합

> **검증 포인트:** 날짜/지역/요일/키워드 검색 동작. 30일 초과 오류 표시. 체크박스 최대 3개 제한.

### Phase 6 — 통계 조회 및 차트

24. `src/app/api/governors/stats/route.ts`
25. `src/components/dashboard/StatsChart.tsx` (ECharts + dataZoom)
26. `src/components/dashboard/DataTable.tsx`
27. `src/components/dashboard/SummaryTables.tsx`

> **검증 포인트:** 정압기 1–3개 조회 시 차트 렌더링. 간격 변경 시 갱신. Y축 범위 1.7–3.0.

### Phase 7 — 엑셀 업로드 + 트랜잭션

28. `src/lib/excel-parser.ts` (exceljs, `docs/references/sample.xlsx` 대조 검증)
29. `src/app/api/crud/route.ts` (트랜잭션 추적 포함)
30. `src/app/api/transactions/create/route.ts`
31. `src/app/api/transactions/in-progress/route.ts`
32. `src/app/api/transactions/rollback/route.ts` (정상 동작)

> **검증 포인트:** `sample.xlsx` 업로드 → DB 반영. 잘못된 형식 → `resCd "0001"`. 업로드 후 rollback → 신규 삽입 데이터 삭제 확인. 진행 중 없을 때 rollback → "No transactions to rollback" 반환.

### Phase 8 — 마무리 및 최종 점검

33. `src/app/dashboard/page.tsx` — 모든 컴포넌트 최종 조합, 로그아웃 버튼
34. 세션 만료(90분) 시나리오 전체 플로우 검증
35. 브라우저 UI 최종 점검 (레이아웃, 반응형 1280px, 폰트, 모달, 로더)

---

## 14. 테스트 및 검증 전략

### 단위 테스트 (Jest)

| 대상 | 테스트 항목 |
|---|---|
| Zod 스키마 (login) | 빈 ID/비밀번호 거부, 유효 입력 통과 |
| Zod 스키마 (search) | 날짜 30일 초과 거부, 특수문자 거부 |
| `excel-parser.ts` | 올바른 시트/컬럼 파싱, `지역.정압기명` 분리, 지역 코드 매핑 |
| `query.ts` | 파라미터 바인딩 정상 동작 |

### API 통합 테스트 (실제 DB 사용 — mock 금지)

- 로컬 PostgreSQL (운영 스키마 복원) 에서 다음 시나리오 검증:
  - `POST /api/auth/login` — 올바른/잘못된 자격증명
  - `POST /api/auth/logout` — 세션 삭제 확인
  - `POST /api/governors/list` — 빈 필터, 각 필터 조합
  - `POST /api/governors/stats` — 1/2/3개 정압기, 각 간격값
  - `POST /api/crud` — 정상 파일, 잘못된 컬럼명 파일
  - `POST /api/transactions/rollback` — 신규 데이터 삭제 확인, 기존 정압기 보존 확인
  - 세션 만료 상태 → 각 API `resCd "0002"` 반환

### 수동 E2E 검증 체크리스트

- [ ] 올바른 ID/비밀번호 → `/dashboard` 이동
- [ ] 잘못된 자격증명 → 오류 메시지 (폼 내 인라인)
- [ ] 세션 없이 `/dashboard` 직접 접근 → `/login` 리다이렉트
- [ ] 검색 → 목록 → 체크박스 선택(최대 3) → 조회 → 차트 표시
- [ ] 간격 변경 → 차트 갱신
- [ ] `.xlsx` 업로드 → 성공 메시지
- [ ] 잘못된 파일 업로드 → 오류 메시지
- [ ] Rollback → 신규 삽입 데이터 삭제, 기존 정압기 통계 삭제
- [ ] 로그아웃 → 세션 삭제 → `/login` 이동
- [ ] 90분 경과 후 AJAX 호출 → 세션 만료 메시지
- [ ] Alert/Confirm 모달 정상 동작
- [ ] 로딩 오버레이 AJAX 중 표시/숨김
- [ ] 반응형 레이아웃 1280px 브레이크포인트

---

## 15. 위험 요소

### 위험도 높음

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| `t_mbr` 인증 방식 | t_mbr에 비밀번호 컬럼이 없어 다중 사용자 개별 인증 불가 | 1차 마일스톤: .env 단일 계정. 다중 사용자는 별도 마일스톤(스키마 변경 필요) |
| Rollback 부분적 미복원 | 기존 정압기의 교체된 통계 복원 불가 (이전 데이터 소멸) | 코드 주석으로 한계 명시. 필요 시 스냅샷 기능을 별도 마일스톤으로 |
| `generate_series()` 정렬 불일치 | 측정 타임스탬프가 간격에 정확히 맞지 않으면 행 누락 | 기존 동작 그대로 복제. 알려진 제한사항으로 문서화 |

### 위험도 중간

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| `exceljs` 파싱 호환성 | `docs/references/sample.xlsx` 를 직접 읽지 못해 형식 가정이 코드 분석에 의존 | Phase 7 시작 시 sample.xlsx 로 실제 검증 필수 |
| `t_file_upload_log` PK 미확인 | db_schema.md에 명시적 PK 없음 | INSERT only (조회 없음) 방식으로 처리. 감사 로그 목적이므로 SELECT 불필요 |
| ECharts `dataZoom` 동작 차이 | 기존 커스텀 스크롤(25 포인트/휠)과 완전 동일하지 않을 수 있음 | 사용자 확인 후 허용 범위 결정 |

### 위험도 낮음

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| `gvrnr_mng_sys_app_transaction` 테이블명 | Django ORM 테이블명이 실제와 다를 경우 | 운영 DB 에서 `\dt gvrnr*` 로 확인 후 사용 |
| Hyperion SSO 2차 마일스톤 연동 | SSO 연동 시 `iron-session` 구조 재사용 가능 여부 | 세션 구조를 `mbr_uid` 중심으로 설계하여 확장 가능하게 유지 |

---

## 16. 확인된 결정사항 (추가 확인 필요 → 해결됨)

> 아래 항목들은 인간이 결정하여 계획에 반영 완료되었다.

| 항목 | 결정 내용 | 반영 위치 |
|---|---|---|
| Hyperion SSO (1차 마일스톤) | **보류.** 로그인 화면으로 대체 | 섹션 7, 아키텍처, 폴더 구조, 파일 목록 전체 |
| `"TEST"` bypass | **제거** | 전체 계획에서 삭제 |
| Hyperion 필드명 | `userId` 로 확인. 2차 마일스톤 SSO 연동 시 사용 | 섹션 7 미래 SSO 메모 |
| 운영 DB 스키마 | **`docs/references/db_schema.md`** 로 확인 완료 | 섹션 6 컬럼명 기준 |
| 엑셀 샘플 파일 | **`docs/references/sample.xlsx`** 존재 확인. Phase 7에서 실제 검증 | 섹션 6 엑셀 파싱, 섹션 13 Phase 7 |
| Rollback 기능 | **정상 동작 구현 필요** | 섹션 6 rollback 설명, 섹션 13 Phase 7 |
| 숨김 필드 (`workDiv` 등) | **데드 코드 확인. 제거** | 섹션 2 제거 항목, 섹션 9 |
| PDF 매뉴얼 / HelpModal | **1차 마일스톤 보류** | 섹션 10, 섹션 11, 섹션 17 |
| URL/도메인 변경 | **변경 없음.** 신규 URL 통보 불필요 | 섹션 17 out-of-scope |
| 로그아웃 | **서버 세션 삭제** 방식으로 구현 | 섹션 7 로그아웃, 섹션 13 Phase 3 |
| `rollabck` URL 오타 | **수정.** 신규 앱에서는 `/api/transactions/rollback` 사용 | 섹션 5 API 라우트 |

### 아직 미결인 항목

| 항목 | 내용 |
|---|---|
| 로그인 계정 방식 | 단일 `.env` 계정 vs `t_mbr` 조회 포함 여부. 현재 계획: `.env` 단일 계정으로 우선 구현. `t_mbr` 존재 여부 검증은 선택적. |
| `gvrnr_mng_sys_app_transaction` 테이블명 | 운영 DB 에서 실제 테이블명 확인 필요. Django 기본값(`appname_modelname`)으로 계획했으나 검증 필요. |

---

## 17. 명확한 Out-of-Scope 항목 (1차 마일스톤)

| 항목 | 이유 |
|---|---|
| **Hyperion SSO 연동 / DES-CBC 복호화** | 1차 마일스톤 보류. 2차 마일스톤에서 구현 |
| **HelpModal + PDF 매뉴얼 링크** | 매뉴얼 파일 미준비. 별도 추가 예정 |
| **데이터베이스 스키마 변경** | 운영 DB 그대로 사용 |
| **다중 사용자 개별 비밀번호** | `t_mbr` 에 비밀번호 컬럼 없음. 스키마 변경 필요 |
| **jsPDF / savePDF 기능** | UI 트리거 없는 데드 코드 |
| **Django 관리자 패널 대체** | 사용 현황 불명확 |
| **`VirtualTransaction` 모델** | 목적 미상 |
| **RTL CSS** | 한국어 전용 앱 |
| **IE11 지원** | 최신 Next.js 불필요 |
| **다중 페이지 라우팅** | 단일 페이지 앱 구조 유지 |
| **역할 기반 접근 제어 (RBAC)** | 단일 사용자 유형 |
| **Rollback 완전 복원** (기존 정압기 이전 통계) | 이전 통계 소멸로 복원 불가. 스냅샷 기능은 별도 마일스톤 |

---

## 18. 구현 승인 전 체크리스트

### 기술적 전제조건

- [ ] 로컬 PostgreSQL 에서 운영 DB 스키마 복원 완료 (또는 운영 DB 직접 접근 가능) 
- [ ] `gvrnr_mng_sys_app_transaction` 실제 테이블명 운영 DB 에서 확인
- [ ] `.env.local` 의 `LOGIN_ID`, `LOGIN_PASSWORD` 값 결정
- [ ] `SESSION_SECRET` 생성 (32자 이상 랜덤 문자열)
- [ ] 새 Next.js 프로젝트 저장 경로 결정

### 미결 항목 확인

- [ ] 로그인 시 `t_mbr` 조회 포함 여부 결정
- [ ] Rollback 한계(기존 정압기 통계 복원 불가) 사용자 인지 및 동의

### 계획 승인

- [ ] 이 계획(`docs/plan.md`) 전체 내용 검토 완료
- [ ] 1차 마일스톤 범위(섹션 11) 동의
- [ ] Out-of-Scope 항목(섹션 17) 동의
- [ ] 구현 순서(섹션 13) 동의
- [ ] **구현 시작 승인**
