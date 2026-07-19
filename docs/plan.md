# docs/plan.md — 정압기 관리 시스템: React(Pure JS) + Spring Boot 마이그레이션 구현 계획 (1차 마일스톤)

> 이 계획은 `docs/research.md` 와 `docs/references/db_schema.md` 를 출처로 사용한다.
> **v2 개정 (2026-07-17):** 스택을 Next.js(TypeScript) 단일 앱에서 **React(Pure JS) SPA + Spring Boot REST API 분리 서버**로 전면 변경했고, UI/UX는 "기존 재현"이 아닌 **완전 리뉴얼**로 목표를 변경했다. 도메인 규칙(응답코드 체계, 지역코드, 요일값, DB 스키마 불변 등)은 v1과 동일하게 유지된다.
> 확인된 인간 결정사항은 섹션 16에 기록되어 있으며, 이 계획 전체에 반영되었다.
> 구현은 인간의 명시적 승인 이후에만 시작한다.

---

## 1. 마이그레이션 목표

- Django 4.0.5 기반 정압기 관리 시스템을 **React(Pure JS, TypeScript 미사용) SPA + Spring Boot REST API** 구조로 재구축한다.
- 프론트엔드와 백엔드는 **별도 서버로 분리**한다 (동일 origin 모놀리식이 아님).
- 기존 PostgreSQL 데이터베이스와 테이블 스키마는 **변경하지 않는다.**
- **1차 마일스톤 인증:** Hyperion SSO 연동은 보류. 대신 **ID/비밀번호 로그인 화면**으로 대체한다.
- 모든 raw SQL 문자열 보간을 **파라미터화 쿼리(`JdbcTemplate`/`NamedParameterJdbcTemplate`)로 전면 교체**하여 SQL Injection을 제거한다.
- 기존 기능(도메인 요구사항)은 충실히 재현하되, **UI/UX는 처음부터 새로 설계한다.** (Bootstrap 대응표 폐기)
- **Rollback 기능을 정상 동작하도록 재구현한다.** (기존 Django 코드는 비동작 상태)
- 1차 마일스톤은 **프론트엔드/백엔드 모두 단독으로 배포 가능한 완성된 앱**으로 마무리한다.

---

## 2. 현재 프로젝트에서 가져가야 할 핵심 구조

### 반드시 동일하게 유지해야 하는 항목 (스택과 무관한 도메인 규칙)

| 항목 | 이유 |
|---|---|
| 응답 코드 체계 (`resCd: "0000"/"0001"/"0002"`) | 클라이언트 공통 처리 패턴 유지. HTTP 상태코드 방식으로의 전환은 협의 필요(v1과 동일, 미협의) |
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
| raw SQL f-string 보간 (SQL Injection) | `JdbcTemplate` 파라미터 바인딩(`:name` / `?`)으로 전면 교체 |
| Django uWSGI 세션 | Spring Boot 내장 `HttpSession` + httpOnly 쿠키 |
| 비동작 Rollback (Gvrnr_model.objects 오류) | `transaction.data` JSON 컬럼 기반 정상 동작 Rollback |
| jQuery + FormData AJAX | React state + `fetch` API |
| Bootstrap 5 + 로컬 번들 | **Tailwind CSS 단독 (커스텀 디자인 시스템, 완전 리뉴얼)** |
| CDN ECharts + 커스텀 스크롤 JS | `echarts-for-react` + 네이티브 `dataZoom` |
| pandas 엑셀 파싱 | **Apache POI** (Java, 서버 측) |
| 로그아웃: DOM 숨김만 처리 | 서버 세션 무효화(`session.invalidate()`) + 클라이언트 리다이렉트 |

### 제거하는 항목 (데드 코드 확인)

- `hidden.html` 의 `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type` — 어떤 뷰에서도 사용되지 않음. 마이그레이션 제외.
- `"TEST"` bypass — 제거. 로컬 개발은 로그인 화면으로 진행.

---

## 3. 제안 아키텍처 (분리 서버 구조)

```
┌───────────────────────────────────────────────────────────────┐
│  브라우저 (Client)                                             │
│  - React SPA (Pure JS, Vite 빌드)                              │
│  - React Router (클라이언트 사이드 라우팅)                      │
│  - ECharts (echarts-for-react)                                 │
│  - fetch() → Spring Boot REST API (credentials: 'include')     │
└──────────────────────┬───────────────────────────────────────┘
                        │ HTTP (JSON / multipart), 세션 쿠키 동봉
┌──────────────────────▼───────────────────────────────────────┐
│  Spring Boot (백엔드 서버, 별도 프로세스/포트)                  │
│  ├── Controller  → REST 엔드포인트 (JSON 요청/응답)            │
│  ├── Filter      → 세션 검증 (Next.js middleware 대응)         │
│  ├── Service     → 비즈니스 로직                                │
│  ├── Repository  → JdbcTemplate 기반 파라미터화 쿼리            │
│  └── HttpSession → 서버 세션 (TTL 90분, 슬라이딩)               │
└──────────────────────┬───────────────────────────────────────┘
                        │ JDBC (HikariCP)
┌──────────────────────▼───────────────────────────────────────┐
│  PostgreSQL (기존 DB — 스키마 변경 없음)                       │
│  - t_mbr, t_governor, t_governor_stat, t_region_cd,            │
│    t_file_upload_log, gvrnr_mng_sys_app_transaction            │
└───────────────────────────────────────────────────────────────┘
```

**핵심 아키텍처 결정 (신규/변경):**
- **ORM 없음.** `JdbcTemplate`/`NamedParameterJdbcTemplate` 직접 사용, 파라미터 바인딩으로 작성. (섹션 16 결정사항)
- **프론트/백엔드 완전 분리.** React SPA는 정적 파일로 빌드되어 별도로 서빙되고, Spring Boot는 REST API만 제공한다.
- **저장소 구조: 모노레포.** `trend_one/frontend/`, `trend_one/backend/` 로 한 저장소 내 분리. (섹션 16 결정사항)
- **인증: 서버 세션 쿠키 유지.** Spring Boot 내장 `HttpSession` + httpOnly 쿠키. cross-origin이므로 CORS `allowCredentials` 설정 필수. (섹션 16 결정사항, 섹션 7 상세)
- **전역 상태 라이브러리 없음.** Dashboard 레벨 `useState` + `useReducer` 로 충분 (v1과 동일).
- **UI: Tailwind CSS 단독.** 컴포넌트 라이브러리(shadcn/ui, MUI 등) 미사용, 커스텀 디자인 시스템 구축. (섹션 16 결정사항, 섹션 10 상세)
- **Hyperion SSO:** 1차 마일스톤 범위 밖. 별도 마일스톤에서 연동 예정 (v1과 동일).

### 3a. 로컬 개발 / 배포 시 CORS·쿠키 리스크와 완화 방안

cross-origin 세션 쿠키는 `SameSite=None; Secure` 를 요구하는데, 이는 HTTPS 환경에서만 정상 동작한다. 로컬 개발(HTTP)에서 이 설정을 그대로 쓰면 쿠키가 브라우저에서 거부될 수 있다.

- **로컬 개발 완화책:** Vite dev server의 `server.proxy` 로 `/api/**` 요청을 Spring Boot(`localhost:8080`)로 프록시한다. 브라우저 입장에서는 동일 origin(`localhost:5173`)이 되어 CORS/SameSite 문제가 발생하지 않는다.
- **운영 배포 완화책 (권장, 확정 아님):** 프론트엔드 빌드 산출물을 Spring Boot의 정적 리소스로 서빙하거나, nginx 등 리버스 프록시로 프론트/백엔드를 동일 도메인 하위 경로(`/api/**`)로 묶는다. 이렇게 하면 운영에서도 실질적으로 same-origin이 되어 `SameSite=Lax`로 충분하다.
- **완전 분리 도메인으로 배포해야 하는 경우:** `SameSite=None; Secure` + HTTPS 필수. 이 경우는 인프라팀 확인이 필요한 별도 결정 사항이다 (섹션 16 미결 항목에 추가).

---

## 4. 초기 폴더 구조 (모노레포)

```
trend_one/                          # 현재 저장소 루트
├── docs/                           # 기획/분석 자료 (유지)
├── frontend/                       # React(Pure JS) SPA — Vite
│   ├── index.html
│   ├── vite.config.js              # dev proxy 설정 포함 (섹션 3a)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── .env.local                  # VITE_API_BASE_URL 등
│   ├── public/
│   │   └── fonts/                  # Pretendard 폰트 4종 (woff)
│   └── src/
│       ├── main.jsx                # 엔트리포인트
│       ├── App.jsx                 # 라우터 + ModalProvider 루트
│       ├── router.jsx              # React Router 설정, PrivateRoute
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   └── DashboardPage.jsx
│       ├── components/
│       │   ├── auth/
│       │   │   └── LoginForm.jsx
│       │   ├── dashboard/
│       │   │   ├── SearchForm.jsx
│       │   │   ├── GovernorTable.jsx
│       │   │   ├── StatsChart.jsx
│       │   │   ├── DataTable.jsx
│       │   │   └── SummaryTables.jsx
│       │   └── ui/
│       │       ├── Loader.jsx
│       │       ├── AlertModal.jsx
│       │       └── ConfirmModal.jsx
│       ├── context/
│       │   └── ModalContext.jsx
│       ├── hooks/
│       │   └── useGovernorApi.js
│       ├── lib/
│       │   └── apiClient.js        # fetch 래퍼 (credentials 포함, resCd 처리)
│       ├── constants/
│       │   └── domain.js           # 지역코드, 요일값 등 도메인 상수
│       └── styles/
│           └── index.css           # Tailwind 엔트리
│
└── backend/                        # Spring Boot REST API
    ├── pom.xml                     # Maven (Java 17+, Spring Boot 3.x)
    └── src/
        ├── main/
        │   ├── java/com/trendone/govtrend/
        │   │   ├── GovTrendApplication.java
        │   │   ├── config/
        │   │   │   └── CorsConfig.java           # allowCredentials, allowedOrigins
        │   │   ├── controller/
        │   │   │   ├── AuthController.java        # /api/auth/**
        │   │   │   ├── GovernorController.java     # /api/governors/**
        │   │   │   ├── CrudController.java          # /api/crud
        │   │   │   └── TransactionController.java   # /api/transactions/**
        │   │   ├── service/
        │   │   │   ├── AuthService.java
        │   │   │   ├── GovernorService.java
        │   │   │   ├── ExcelUploadService.java       # Apache POI 파싱
        │   │   │   └── TransactionService.java
        │   │   ├── repository/
        │   │   │   ├── GovernorRepository.java       # JdbcTemplate
        │   │   │   ├── GovernorStatRepository.java
        │   │   │   ├── TransactionRepository.java
        │   │   │   └── FileUploadLogRepository.java
        │   │   ├── dto/
        │   │   │   ├── request/                      # 요청 DTO
        │   │   │   └── response/
        │   │   │       └── ApiResponse.java           # resCd/resMsg 공통 래퍼
        │   │   ├── filter/
        │   │   │   └── SessionCheckFilter.java        # 미들웨어 대응, resCd 0002 반환
        │   │   └── exception/
        │   │       └── GlobalExceptionHandler.java    # @ControllerAdvice
        │   └── resources/
        │       └── application.yml                    # DB, 세션 TTL(90분), 로그인 계정
        └── test/
            └── java/...                                # JUnit + Mockito
```

**v1(Next.js) 대비 변경 사항:**
- 단일 `src/app/api/**` Route Handler 트리 → Spring Boot `controller/service/repository` 3계층 분리
- `middleware.ts` → `SessionCheckFilter.java` (Servlet Filter)
- `lib/session.ts` (iron-session) → Spring Boot 내장 `HttpSession`
- `lib/excel-parser.ts` (exceljs) → `ExcelUploadService.java` (Apache POI)
- `src/types/index.ts` (TS 타입) → 제거. 대신 백엔드 DTO가 계약을 명시하고, 프론트는 JSDoc 주석으로 형태를 문서화 (섹션 8 참고)
- 신규: `GET /api/auth/session` — SPA 부팅 시 세션 유효성 확인용 엔드포인트 (섹션 5에서 상세 설명, v1에는 없던 개념. Next.js는 서버 컴포넌트에서 쿠키를 직접 읽어 리다이렉트했지만, SPA는 클라이언트에서 API 호출로 확인해야 함)

---

## 5. 라우팅 전략

### 프론트엔드 라우트 (React Router)

| 경로 | 컴포넌트 | 설명 |
|---|---|---|
| `/` | 리다이렉트 | 세션 확인 후 `/dashboard` 또는 `/login` 으로 이동 |
| `/login` | `LoginPage` | ID/비밀번호 로그인 폼. 인증 성공 시 `/dashboard` 로 이동 |
| `/dashboard` | `DashboardPage` (`PrivateRoute`) | 세션 필수. 미인증 시 `/login` 으로 리다이렉트 |

> **v1과의 차이:** Next.js는 서버 미들웨어가 요청 단계에서 쿠키를 검사해 리다이렉트를 서버에서 처리했다. SPA는 서버 렌더링이 없으므로, 앱 부팅 시 `GET /api/auth/session` 을 호출해 세션 유효성을 확인한 뒤 클라이언트 라우팅으로 분기해야 한다. `PrivateRoute` 는 이 확인이 끝날 때까지 로딩 상태를 보여준다.

### 백엔드 API 라우트 (Spring Boot REST)

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/auth/login` | POST | 자격증명 검증 + 세션 생성 |
| `/api/auth/logout` | POST | 세션 무효화 |
| `/api/auth/session` | GET | (신규) 현재 세션 유효성 확인 — SPA 부팅/새로고침 시 사용 |
| `/api/governors/list` | POST | 정압기 검색 (기존 `/getGvrnrList/`) |
| `/api/governors/stats` | POST | 통계 조회 (기존 `/getGvrnrStats/`) |
| `/api/crud` | POST | 엑셀 업로드 (기존 `/gvrnrCRUD/`, multipart) |
| `/api/transactions/create` | POST | 트랜잭션 생성 |
| `/api/transactions/in-progress` | POST | 진행 중 트랜잭션 목록 |
| `/api/transactions/rollback` | POST | 전체 롤백 (정상 동작, URL 오타 수정) |

### 세션 검증 필터 (`SessionCheckFilter.java`)

- `/api/governors/**`, `/api/crud`, `/api/transactions/**` 요청에 대해 `HttpSession` 유효성을 검사한다.
- 유효하지 않으면 `{ resCd: "0002", resMsg: "세션이 만료되었습니다." }` (HTTP 200) 반환 — v1과 동일한 계약 유지.
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` 은 필터 대상 제외.

---

## 6. API 레이어 전략

### 데이터베이스 접근

- **`JdbcTemplate` / `NamedParameterJdbcTemplate` 직접 사용.** ORM 없음. (섹션 16 결정사항)
- DB 연결은 Spring Boot 기본 `DataSource`(HikariCP) 로 관리, `application.yml` 에 연결정보 정의.
- 모든 쿼리는 named parameter(`:startDate`) 또는 `?` 바인딩. 문자열 보간 금지.
- DB 스키마는 `docs/references/db_schema.md` 기준으로 컬럼명/타입 사용.

```java
// Repository 계층 공통 패턴 예시
@Repository
public class GovernorRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public List<Governor> findByFilters(GovernorSearchParams params) {
        String sql = "SELECT ... WHERE (:srchCity IS NULL OR g.cate_cd = :srchCity) ...";
        return jdbcTemplate.query(sql, new MapSqlParameterSource()
            .addValue("srchCity", params.getSrchCity()), governorRowMapper);
    }
}
```

### API 엔드포인트별 처리 방식

**`POST /api/auth/login`**
1. 요청 바디(JSON 또는 form)에서 `loginId`, `password` 수신
2. 환경변수/설정값(`application.yml` 의 `app.login-id`, `app.login-password`)과 비교
3. 일치하면 `t_mbr` 에서 해당 `mbr_uid` 존재 여부 확인 (선택적 — 섹션 16 참고)
4. `HttpSession` 에 `{ mbrUid, sessionExists: true }` 저장
5. 응답: `{ resCd: "0000" }` 또는 실패 시 `{ resCd: "0001", resMsg: "아이디 또는 비밀번호가 올바르지 않습니다." }`

**`POST /api/auth/logout`**
1. `session.invalidate()`
2. 응답: `{ resCd: "0000" }` → 클라이언트는 `/login` 으로 리다이렉트

**`GET /api/auth/session`** (신규, v1에 없던 엔드포인트)
1. `HttpSession` 유효성만 확인, 부수효과 없음
2. 응답: `{ resCd: "0000", isLoggedIn: true|false }`

**`POST /api/governors/list`**
1. 세션 검증 (필터)
2. `startDate`, `endDate`, `inspctDay`, `srchCity`, `srchCntnt` 수신
3. `db_schema.md` 기준 컬럼명(`gvrnr_uid`, `gvrnr_nm`, `inspct_day`, `cate_cd`, `cd_name`) 사용
4. 기존 SQL을 `NamedParameterJdbcTemplate` 파라미터화 쿼리로 재작성
5. 응답: `{ resCd: "0000", gvrnrList: [{ gvrnr_uid, gvrnr_nm, inspct_day, gvrnr_stat_cnt, cd_name }] }`

**`POST /api/governors/stats`**
1. `gvrnrUids`(쉼표 구분 또는 배열), `gvrnrNms`, `startDate`, `endDate`, `intervalNum` 수신
2. 기존 `getGvrnrStats` SQL (`generate_series()` 포함) 파라미터화 쿼리로 재작성
3. UID 목록: PostgreSQL 배열 바인딩(`= ANY(:uids)`) 패턴으로 처리
4. `db_schema.md` 기준 컬럼명(`gvrnr_press1`, `gvrnr_press2`, `gvrnr_trnsps1`, `gvrnr_trnsps2`, `record_dttm`) 사용
5. 응답: `{ resCd: "0000", xAxisList: [...], statDataObj: {...} }`

**`POST /api/crud`** (multipart)
1. `MultipartFile` 로 업로드 파일 수신
2. Apache POI(`XSSFWorkbook`)로 `.xlsx` 파일 파싱
3. `gvrnr_mng_sys_app_transaction` 에 `status="pending"` 트랜잭션 생성
4. Spring `@Transactional` 내에서:
   - 시트별: 지역/정압기명 파싱 → `t_governor` 조회 → 없으면 INSERT (새 uid 목록 추적) → `t_governor_stat` DELETE 후 INSERT
   - `t_file_upload_log` 에 로그 기록 (`mbr_uid`, `success_yn`, `file_name`, 감사 컬럼)
5. 트랜잭션 `data` 컬럼(JSON) 업데이트: `{ new_gvrnr_uids: [...], updated_gvrnr_uids: [...] }`
6. 성공 시 `status="completed"`, 실패 시 `@Transactional` 롤백 + `status="failed"`
7. 응답: `{ resCd: "0000"|"0001"|"0002", resMsg: "..." }`

**`POST /api/transactions/rollback`**
1. 세션 검증
2. `gvrnr_mng_sys_app_transaction` 에서 `status IN ('pending', 'in_progress')` 인 트랜잭션 조회
3. 없으면: `{ resCd: "0000", message: "No transactions to rollback" }` 반환
4. `@Transactional` 내에서:
   - 각 트랜잭션의 `data->>'new_gvrnr_uids'` + `data->>'updated_gvrnr_uids'` 수집
   - `DELETE FROM t_governor_stat WHERE gvrnr_uid = ANY(:uids)` (전체 영향 uid)
   - `DELETE FROM t_governor WHERE gvrnr_uid = ANY(:newUids)` (신규 삽입 uid만)
   - `UPDATE gvrnr_mng_sys_app_transaction SET status='rolled_back', updated_at=NOW() WHERE id IN (:ids)`
5. 응답: `{ resCd: "0000" }`

> **롤백 한계:** `updated_gvrnr_uids` (기존 정압기의 통계 교체) 의 경우 새 통계는 삭제되지만 이전 통계는 복원 불가. 기존 정압기 마스터 레코드(`t_governor` 행)는 보존된다. 이 한계는 코드 주석으로 명시한다. (v1과 동일)

### Django Transaction 테이블 스키마 (`gvrnr_mng_sys_app_transaction`)

`0001_initial.py` 에서 확인한 컬럼 (v1과 동일):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BigInteger (PK) | 자동 증가 |
| `transaction_id` | UUID (unique) | 외부 식별자 |
| `status` | varchar(50) | pending / in_progress / completed / rolled_back / failed |
| `data` | jsonb | 영향받은 gvrnr_uid 목록 저장 |
| `created_at` | timestamp | 생성일시 |
| `updated_at` | timestamp | 수정일시 |

### 엑셀 파싱 (`ExcelUploadService.java`)

- **Apache POI** (`poi-ooxml`) 사용
- 파싱 가정 (코드 분석 기반, Phase 7에서 `docs/references/sample.xlsx` 대조 검증 — v1과 동일하게 미검증 상태):
  - 시트명: 한국어 요일 (화요일, 수요일, ...)
  - 0번 컬럼: datetime
  - 나머지 컬럼 헤더: `"지역.정압기명"` (`.` 으로 분리)
  - 지역 판별: 컬럼명에 `"경기"` 포함 → `cate_cd = "3100"`, 아니면 `"1100"` (서울)
- `db_schema.md` 기준: insert 시 `gvrnr_press1`, `gvrnr_press2`, `gvrnr_trnsps1`, `gvrnr_trnsps2`, `record_dttm` 컬럼 사용

---

## 7. 인증/권한 처리 전략

### 1차 마일스톤: ID/비밀번호 로그인 + 서버 세션 쿠키

**흐름:**
```
사용자 → /login 페이지 (React SPA)
  → ID + 비밀번호 입력 → POST /api/auth/login (credentials: 'include')
  → Spring Boot: application.yml 의 loginId / loginPassword 와 비교
  → 일치 시: HttpSession 생성 → Set-Cookie 응답 → 프론트는 /dashboard 로 이동
  → 불일치 시: 오류 메시지 표시
```

**구현 세부사항:**
- 세션 쿠키: `server.servlet.session.cookie.http-only=true`, `.secure=true`(운영), `.same-site=Lax`(same-origin 배포 시) 또는 `None`(완전 분리 도메인 배포 시, HTTPS 필수 — 섹션 3a 참고)
- 세션 TTL: `server.servlet.session.timeout=90m` — 서블릿 컨테이너 기본 동작이 요청마다 타이머를 갱신하므로 슬라이딩 윈도우가 자동으로 재현됨 (v1의 `iron-session` 수동 `session.save()` 재호출과 동일한 효과, 별도 코드 불필요)
- 세션 데이터: `HttpSession` 속성 `mbrUid`, `sessionExists`
- 로그아웃: `POST /api/auth/logout` → `session.invalidate()` → 클라이언트 `/login` 리다이렉트
- **CORS 설정 필수:** `CorsConfig.java` 에서 프론트엔드 origin 을 명시적으로 허용하고 `allowCredentials(true)` 설정. 와일드카드(`*`) origin은 `allowCredentials` 와 함께 사용 불가하므로 반드시 정확한 origin을 나열해야 한다.

**인증 자격증명 방식:**
- `application.yml` (또는 환경변수 오버라이드)에 `app.login-id`, `app.login-password` 로 정의
- 이는 1차 마일스톤용 임시 방식. 추후 `t_mbr` 기반 다중 사용자 인증으로 전환 예정
- `t_mbr` 에 비밀번호 컬럼이 없으므로 현재는 단일 계정 방식으로 운영

> **주의:** `t_mbr` 에는 비밀번호 컬럼이 존재하지 않는다 (`docs/references/db_schema.md` 확인). 다중 사용자 개별 비밀번호 인증은 DB 스키마 변경이 필요하므로 1차 마일스톤 범위 밖이다. (v1과 동일)

**미래 SSO 연동 (2차 마일스톤 예정):**
- Hyperion SSO → DES-CBC(key=IV=`b'h2h0i1c5'`) 복호화 → 세션 방식 구현
- `userId` 필드명으로 수신 (확인된 값)
- 이 시점에 Java `javax.crypto` 기반 DES 복호화 유틸 추가 및 `/auth` (SSO 릴레이) 페이지/엔드포인트 구현

**권한/역할:** 없음. 단일 사용자 유형. 세션 존재 여부만 확인. (v1과 동일)

### `LoginForm` 컴포넌트 동작 (Pure JS)

- ID/비밀번호 입력 폼 (React Hook Form, JSX/JS)
- POST `/api/auth/login` 호출 (fetch, `credentials: 'include'`)
- 성공: `navigate('/dashboard')` (React Router)
- 실패: 오류 메시지 인라인 표시 (모달 없이 폼 내 표시)
- 앱 부팅 시 `GET /api/auth/session` 결과에 따라 이미 로그인 상태면 `/dashboard` 로 자동 리다이렉트

---

## 8. 상태 관리 전략 (Pure JS 영향)

전역 상태 라이브러리(Zustand, Redux) 없음. Dashboard 페이지 레벨 React state 로 충분 (v1과 동일한 원칙).

### TypeScript 제거에 따른 보완 방침

- 컴파일 타임 타입 체크가 사라지므로, **재사용 컴포넌트(`ui/*`, `dashboard/*`)에 한해 `prop-types` 패키지로 런타임 props 검증**을 추가한다. 전 컴포넌트 강제 적용은 아니며, 외부에서 호출되는 공용 컴포넌트 위주로 적용한다.
- API 응답 형태 등 복잡한 객체 구조는 **JSDoc `@typedef` 주석**으로 문서화하여 에디터 자동완성을 확보한다 (별도 `.d.ts` 파일 없이 `.js`/`.jsx` 내 주석으로 처리).
- 백엔드 DTO(`dto/response/*.java`)가 API 계약의 단일 진실 공급원(source of truth) 역할을 한다.

### 상태 매핑

| 기존 변수 | 마이그레이션 대상 | 위치 |
|---|---|---|
| `PROC_CHK` 문자열 플래그 | `loading` (boolean state) | `DashboardPage.jsx` |
| `gvrnrUids` / `gvrnrNms` | `selectedGovernors` (array state) | `DashboardPage.jsx` |
| `press2Data` / `press2ChartData` | `statsData` (state, null 초기값) | `DashboardPage.jsx` |
| `myChart` ECharts 인스턴스 | `chartRef` (`useRef`) | `StatsChart.jsx` |
| `xAxisList` | `statsData.xAxisList` 에서 파생 | `StatsChart.jsx` |
| `chkboxCnt` (최대 3 선택) | `selectedGovernors.length >= 3` 으로 파생 | `GovernorTable.jsx` |
| 검색 폼 값 | React Hook Form `watch()` | `SearchForm.jsx` |

### 컴포넌트 간 데이터 흐름

```
DashboardPage.jsx  (state 최상위)
  ├── SearchForm.jsx        → onSearch(formData) 콜백
  ├── GovernorTable.jsx     → governors, onSelect(uid, nm) 콜백
  ├── StatsChart.jsx        → statsData, xAxisList
  ├── DataTable.jsx         → statsData
  └── SummaryTables.jsx     → statsData
```

**Alert/Confirm 모달:** `ModalContext` (React Context) 로 `openAlert(msg, type)`, `openConfirm(msg, onOk)` 어디서든 호출 가능 (v1과 동일).

---

## 9. Form 처리 전략

### 라이브러리: React Hook Form + Zod (Pure JS에서도 그대로 사용 가능)

> `zod` 는 TypeScript 비의존 라이브러리이므로 Pure JS 환경에서도 스키마 정의·검증 기능을 동일하게 사용할 수 있다. 다만 `z.infer` 로 타입을 뽑아내는 이점만 사라진다.

**LoginForm 스키마:**
```javascript
const loginSchema = z.object({
  loginId: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});
```

**SearchForm 스키마:**
```javascript
const searchSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  srchCity: z.enum(["3100", "1100"]).optional(),
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
- 선택 즉시 `FormData` 구성 → `fetch(apiUrl('/api/crud'), { method: 'POST', body: formData, credentials: 'include' })`

**제거된 항목 (데드 코드):**
- `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type` — 마이그레이션에서 완전 제외 (v1과 동일)

---

## 10. 공통 UI/Component 전략 (UI/UX 완전 리뉴얼)

### 방침: Tailwind CSS 단독, 커스텀 디자인 시스템

> **v1과의 근본적 차이:** v1은 "Bootstrap → shadcn/ui" 매핑표를 통해 **기존 화면을 충실히 재현**하는 것이 목표였다. v2는 UI/UX를 **처음부터 새로 설계**하는 것이 목표이므로, 컴포넌트 매핑표 자체가 무의미하다. 컴포넌트 라이브러리(shadcn/ui, MUI, Ant Design)는 사용하지 않고, Tailwind 유틸리티 클래스만으로 직접 구현한다.

**이 결정이 의미하는 것 (필요 작업):**
- 공용 컴포넌트(버튼, 인풋, 셀렉트, 모달, 테이블, 로더, 배지 등)를 프로젝트 초기에 `components/ui/` 에 직접 구현해야 한다. 서드파티 라이브러리가 대신 만들어주지 않는다.
- 색상 팔레트, 타이포그래피 스케일, 스페이싱 규칙, 반응형 브레이크포인트 등 **디자인 토큰을 `tailwind.config.js` 에 먼저 정의**해야 한다. (현재 미정 — 별도 디자인 논의 필요, 섹션 16 미결 항목)
- 기존 `main.css` 레이아웃(헤더 6%, 메인 94%, 2컬럼)을 그대로 가져올 필요 없음. 정보 구조(검색 필터 → 목록/체크박스 → 차트 → 데이터 테이블 → 요약)는 기능 요구사항이므로 유지하되, 레이아웃/비주얼은 새로 설계한다.

**기능적으로 유지해야 하는 컴포넌트 목록 (디자인은 신규, 기능은 유지):**

| 기능 | 신규 컴포넌트 | 비고 |
|---|---|---|
| Alert 모달 | `AlertModal.jsx` | `openAlert(msg, succYn, callback)` 인터페이스 유지 |
| Confirm 모달 | `ConfirmModal.jsx` | `openConfirm(msg, okCallback)` 인터페이스 유지 |
| 로딩 오버레이 | `Loader.jsx` | React portal + Tailwind backdrop |
| 통계 차트 | `StatsChart.jsx` | ECharts, `echarts-for-react` 또는 `useEffect` + `echarts.init` |
| 셀렉트(간격 선택 등) | 커스텀 `Select.jsx` | Tailwind로 직접 구현 |
| 로그인 폼 | `LoginForm.jsx` | ID + 비밀번호 입력, React Hook Form |

**1차 마일스톤에서 제외:**
- `HelpModal.jsx` — PDF 매뉴얼 미준비. 별도 추가 예정 (v1과 동일)

### ECharts 통합 전략 (v1과 동일)

- 기존 `chart_handle.js` 커스텀 스크롤/터치 코드를 ECharts 네이티브 `dataZoom` 으로 대체
- `dataZoom: [{ type: "inside" }, { type: "slider" }]` 로 내장 처리
- Y축 범위 1.7–3.0 고정 (데이터 초과 시 자동 확장) 유지
- 최대 3개 시리즈 동시 표시 유지
- `useRef` + `useEffect` 로 ECharts 인스턴스 관리

### 폰트

- Pretendard 폰트 파일: 기존 `static/css/fonts/Pretendard-*.woff` 4종을 `frontend/public/fonts/` 로 복사, `@font-face` 로 Tailwind 글로벌 스타일에 등록 (`next/font/local` 대응 기능이 없으므로 표준 `@font-face` 사용)

---

## 11. 1차 구현 마일스톤 범위

### 포함 (Must Have) — 프론트엔드

1. Vite + React(Pure JS) 프로젝트 초기 설정, React Router
2. Tailwind CSS 설정 + 디자인 토큰 정의 (색상/타이포/스페이싱)
3. Pretendard 폰트 (`@font-face`)
4. `apiClient.js` — fetch 래퍼 (credentials 포함, resCd 공통 처리)
5. `LoginForm` 컴포넌트 (React Hook Form + Zod)
6. `LoginPage`, `PrivateRoute`
7. `DashboardPage` 래퍼 + `useGovernorApi` 훅
8. `SearchForm`, `GovernorTable` 컴포넌트
9. `StatsChart` (ECharts + dataZoom), `DataTable`, `SummaryTables` 컴포넌트
10. 엑셀 업로드 UI (파일 선택 → `FormData` 전송)
11. `Loader`, `AlertModal`, `ConfirmModal` + `ModalContext`

### 포함 (Must Have) — 백엔드

12. Spring Boot 프로젝트 초기 설정 (Maven, Java 17+, Spring Web, Spring JDBC)
13. `DataSource`/HikariCP 연결, `application.yml`
14. `HttpSession` 기반 세션 관리, `SessionCheckFilter`
15. `CorsConfig` — 프론트엔드 origin 허용, credentials 허용
16. `AuthController` — `/api/auth/login|logout|session`
17. `GovernorController` + `GovernorRepository` — `/api/governors/list|stats`
18. `ExcelUploadService` (Apache POI) + `CrudController` — `/api/crud`
19. `TransactionController` + `TransactionRepository` — create/in-progress/rollback
20. `ApiResponse` 공통 응답 래퍼(resCd/resMsg), `GlobalExceptionHandler`
21. `application.yml` 설정 (DB 연결, 세션 TTL, 로그인 계정)

### 제외 (1차 마일스톤 명시적 범위 밖)

섹션 17 참고.

---

## 12. 변경/생성 대상 파일 목록

> 모노레포 내 `frontend/`, `backend/` 두 디렉토리를 새로 생성한다. 기존 Django 프로젝트 파일은 `docs/references/legacy/`에 참고용으로만 유지하며 수정하지 않는다.

### 프론트엔드 설정 파일

- `frontend/package.json`
- `frontend/vite.config.js` (dev proxy 포함)
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/.env.local` — `VITE_API_BASE_URL`

### 프론트엔드 소스

- `frontend/src/main.jsx`, `App.jsx`, `router.jsx`
- `frontend/src/pages/LoginPage.jsx`, `DashboardPage.jsx`
- `frontend/src/components/auth/LoginForm.jsx`
- `frontend/src/components/dashboard/SearchForm.jsx`, `GovernorTable.jsx`, `StatsChart.jsx`, `DataTable.jsx`, `SummaryTables.jsx`
- `frontend/src/components/ui/Loader.jsx`, `AlertModal.jsx`, `ConfirmModal.jsx`, `Select.jsx` (신규 커스텀)
- `frontend/src/context/ModalContext.jsx`
- `frontend/src/hooks/useGovernorApi.js`
- `frontend/src/lib/apiClient.js`
- `frontend/src/constants/domain.js`
- `frontend/src/styles/index.css`

### 프론트엔드 자산

- `frontend/public/fonts/Pretendard-Light.woff` 외 3종 (기존 `static/css/fonts/` 에서 복사)

### 백엔드 설정 파일

- `backend/pom.xml`
- `backend/src/main/resources/application.yml`

### 백엔드 소스

- `backend/.../GovTrendApplication.java`
- `backend/.../config/CorsConfig.java`
- `backend/.../controller/AuthController.java`, `GovernorController.java`, `CrudController.java`, `TransactionController.java`
- `backend/.../service/AuthService.java`, `GovernorService.java`, `ExcelUploadService.java`, `TransactionService.java`
- `backend/.../repository/GovernorRepository.java`, `GovernorStatRepository.java`, `TransactionRepository.java`, `FileUploadLogRepository.java`
- `backend/.../dto/request/**`, `dto/response/ApiResponse.java`
- `backend/.../filter/SessionCheckFilter.java`
- `backend/.../exception/GlobalExceptionHandler.java`

---

## 13. 구현 순서

### Phase 1 — 프론트엔드 기반 설정

1. `npm create vite@latest frontend -- --template react` (JavaScript 템플릿, TS 아님)
2. Tailwind CSS 설정 + 디자인 토큰 초안 정의
3. React Router 설정 (`router.jsx`, `PrivateRoute` 스텁)
4. `@font-face` 로 Pretendard 폰트 설정 (woff 4종 복사)
5. `apiClient.js` — fetch 래퍼 초안 (baseURL, credentials, resCd 처리)

### Phase 2 — 백엔드 기반 설정

6. Spring Initializr로 `backend/` 스캐폴드 (Web, JDBC, PostgreSQL Driver)
7. `application.yml` — DB 연결, 세션 TTL(90분), 로그인 계정 플레이스홀더
8. `CorsConfig.java` — 프론트 origin 허용 + credentials
9. `SessionCheckFilter.java` — 세션 검증 필터 스켈레톤
10. `ApiResponse.java` — 공통 응답 래퍼

### Phase 3 — 로그인 흐름

11. `AuthController` — `/api/auth/login`, `/logout`, `/session`
12. `AuthService` — 자격증명 검증 + `HttpSession` 설정
13. `LoginForm.jsx`, `LoginPage.jsx`
14. `PrivateRoute` — `GET /api/auth/session` 호출 기반 라우트 가드
15. `apiClient.js` 에 인증 관련 함수 추가

> **검증 포인트:** 올바른 ID/비밀번호 → `/dashboard` 이동. 틀린 자격증명 → 오류 메시지. 세션 없이 `/dashboard` 직접 접근 → `/login` 리다이렉트. 로그아웃 → 세션 무효화 후 `/login` 이동. **cross-origin 쿠키가 실제로 브라우저에 저장/전송되는지 반드시 수동 확인** (신규 리스크, 섹션 15).

### Phase 4 — 공통 UI 컴포넌트 (디자인 시스템 구축 포함)

16. Tailwind 디자인 토큰 확정 (색상/타이포/스페이싱 — 섹션 16 미결 항목 해결 후 진행)
17. `ModalContext.jsx`
18. `AlertModal.jsx`, `ConfirmModal.jsx`, `Loader.jsx`, `Select.jsx` (Tailwind로 직접 구현)
19. `App.jsx` — ModalProvider 적용

### Phase 5 — 정압기 검색

20. `GovernorController` + `GovernorRepository` (`/api/governors/list`)
21. `SearchForm.jsx` (React Hook Form + Zod)
22. `GovernorTable.jsx` (체크박스, 최대 3개 선택)
23. `DashboardPage.jsx` — SearchForm + GovernorTable 조합

> **검증 포인트:** 날짜/지역/요일/키워드 검색 동작. 30일 초과 오류 표시. 체크박스 최대 3개 제한.

### Phase 6 — 통계 조회 및 차트

24. `GovernorController` (`/api/governors/stats`) + `GovernorStatRepository`
25. `StatsChart.jsx` (ECharts + dataZoom)
26. `DataTable.jsx`, `SummaryTables.jsx`

> **검증 포인트:** 정압기 1–3개 조회 시 차트 렌더링. 간격 변경 시 갱신. Y축 범위 1.7–3.0.

### Phase 7 — 엑셀 업로드 + 트랜잭션

27. `ExcelUploadService.java` (Apache POI, `docs/references/sample.xlsx` 대조 검증)
28. `CrudController` (`/api/crud`)
29. `TransactionController` + `TransactionRepository` (create/in-progress/rollback)

> **검증 포인트:** `sample.xlsx` 업로드 → DB 반영. 잘못된 형식 → `resCd "0001"`. 업로드 후 rollback → 신규 삽입 데이터 삭제 확인. 진행 중 없을 때 rollback → "No transactions to rollback" 반환.

### Phase 8 — 마무리 및 최종 점검

30. 프론트엔드 전체 컴포넌트 최종 조합, 로그아웃 버튼
31. 세션 만료(90분) 시나리오 전체 플로우 검증
32. **CORS/쿠키 배포 토폴로지 확정** — dev proxy vs 운영 리버스 프록시 vs 완전 분리 도메인 (섹션 3a, 신규 검증 항목)
33. 브라우저 UI 최종 점검 (레이아웃, 반응형, 폰트, 모달, 로더)

---

## 14. 테스트 및 검증 전략

### 프론트엔드 단위 테스트 (Jest 또는 Vitest)

| 대상 | 테스트 항목 |
|---|---|
| Zod 스키마 (login) | 빈 ID/비밀번호 거부, 유효 입력 통과 |
| Zod 스키마 (search) | 날짜 30일 초과 거부, 특수문자 거부 |
| `apiClient.js` | resCd 분기 처리 정상 동작 |

### 백엔드 단위 테스트 (JUnit + Mockito)

| 대상 | 테스트 항목 |
|---|---|
| `ExcelUploadService` | 올바른 시트/컬럼 파싱, `지역.정압기명` 분리, 지역 코드 매핑 |
| `GovernorRepository` | 파라미터 바인딩 정상 동작 (테스트 DB 대상) |
| `AuthService` | 자격증명 검증 로직 |

### API 통합 테스트 (실제 DB 사용 — mock 금지, v1과 동일 원칙)

- 로컬 PostgreSQL (운영 스키마 복원) 에서 다음 시나리오 검증:
  - `POST /api/auth/login` — 올바른/잘못된 자격증명
  - `POST /api/auth/logout`, `GET /api/auth/session` — 세션 상태 확인
  - `POST /api/governors/list` — 빈 필터, 각 필터 조합
  - `POST /api/governors/stats` — 1/2/3개 정압기, 각 간격값
  - `POST /api/crud` — 정상 파일, 잘못된 컬럼명 파일
  - `POST /api/transactions/rollback` — 신규 데이터 삭제 확인, 기존 정압기 보존 확인
  - 세션 만료 상태 → 각 API `resCd "0002"` 반환

### 수동 E2E 검증 체크리스트

- [ ] 올바른 ID/비밀번호 → `/dashboard` 이동
- [ ] 잘못된 자격증명 → 오류 메시지 (폼 내 인라인)
- [ ] 세션 없이 `/dashboard` 직접 접근 → `/login` 리다이렉트
- [ ] **cross-origin 세션 쿠키가 브라우저에 정상 저장/전송됨** (신규, 개발/운영 환경 각각 확인)
- [ ] 검색 → 목록 → 체크박스 선택(최대 3) → 조회 → 차트 표시
- [ ] 간격 변경 → 차트 갱신
- [ ] `.xlsx` 업로드 → 성공 메시지
- [ ] 잘못된 파일 업로드 → 오류 메시지
- [ ] Rollback → 신규 삽입 데이터 삭제, 기존 정압기 통계 삭제
- [ ] 로그아웃 → 세션 무효화 → `/login` 이동
- [ ] 90분 경과 후 API 호출 → 세션 만료 메시지
- [ ] Alert/Confirm 모달 정상 동작
- [ ] 로딩 오버레이 API 호출 중 표시/숨김
- [ ] 반응형 레이아웃 확인 (신규 디자인 기준)

---

## 15. 위험 요소

### 위험도 높음

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| **cross-origin 세션 쿠키** (신규) | 프론트/백엔드 분리 origin에서 `SameSite`/`Secure` 설정이 배포 환경과 맞지 않으면 로그인이 브라우저에서 조용히 실패할 수 있음 | Phase 3에서 실제 브라우저 쿠키 저장 여부 수동 검증 필수. dev proxy로 로컬 개발 단순화 (섹션 3a) |
| `t_mbr` 인증 방식 | t_mbr에 비밀번호 컬럼이 없어 다중 사용자 개별 인증 불가 | 1차 마일스톤: 설정값 단일 계정. 다중 사용자는 별도 마일스톤(스키마 변경 필요) |
| Rollback 부분적 미복원 | 기존 정압기의 교체된 통계 복원 불가 (이전 데이터 소멸) | 코드 주석으로 한계 명시. 필요 시 스냅샷 기능을 별도 마일스톤으로 |
| `generate_series()` 정렬 불일치 | 측정 타임스탬프가 간격에 정확히 맞지 않으면 행 누락 | 기존 동작 그대로 복제. 알려진 제한사항으로 문서화 |

### 위험도 중간

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| **디자인 토큰 미정** (신규) | UI/UX 완전 리뉴얼인데 색상/타이포/레이아웃 방향이 아직 결정되지 않음 | Phase 4 시작 전 별도 디자인 논의로 확정 (섹션 16 미결 항목) |
| **커스텀 컴포넌트 구현 비용** (신규) | 컴포넌트 라이브러리 미사용으로 모달/셀렉트/테이블 등을 직접 구현 | 범위를 1차 마일스톤 필요 컴포넌트로 한정 (섹션 10 목록) |
| Apache POI 파싱 호환성 | `docs/references/sample.xlsx` 를 아직 실제로 읽어보지 않아 형식 가정이 코드 분석에 의존 | Phase 7 시작 시 sample.xlsx 로 실제 검증 필수 |
| `t_file_upload_log` PK 미확인 | db_schema.md에 명시적 PK 없음 | INSERT only (조회 없음) 방식으로 처리. 감사 로그 목적이므로 SELECT 불필요 |
| ECharts `dataZoom` 동작 차이 | 기존 커스텀 스크롤(25 포인트/휠)과 완전 동일하지 않을 수 있음 | 사용자 확인 후 허용 범위 결정 |

### 위험도 낮음

| 위험 | 내용 | 완화 방안 |
|---|---|---|
| `gvrnr_mng_sys_app_transaction` 테이블명 | Django ORM 테이블명이 실제와 다를 경우 | 운영 DB 에서 `\dt gvrnr*` 로 확인 후 사용 |
| Hyperion SSO 2차 마일스톤 연동 | SSO 연동 시 세션 구조 재사용 가능 여부 | 세션 구조를 `mbrUid` 중심으로 설계하여 확장 가능하게 유지 |

---

## 16. 확인된 결정사항

> 아래 항목들은 인간이 결정하여 계획에 반영 완료되었다.

### v1 결정사항 (계승)

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
| 로그아웃 | **서버 세션 무효화** 방식으로 구현 | 섹션 7 로그아웃, 섹션 13 Phase 3 |
| `rollabck` URL 오타 | **수정.** 신규 앱에서는 `/api/transactions/rollback` 사용 | 섹션 5 API 라우트 |

### v2 결정사항 (2026-07-17, 스택 전환)

| 항목 | 결정 내용 | 반영 위치 |
|---|---|---|
| 프론트엔드 스택 | **React(Pure JS) + Vite**, TypeScript 미사용 | 전체 계획 |
| 백엔드 스택 | **Spring Boot** (별도 서버) | 전체 계획 |
| 저장소 구조 | **모노레포** (`frontend/`, `backend/` 한 저장소 내 분리) | 섹션 3, 4, 12 |
| 백엔드 DB 접근 방식 | **`JdbcTemplate`/`NamedParameterJdbcTemplate`** (ORM 없음, v1 원칙 계승) | 섹션 3, 6, 13 |
| 인증/세션 전략 | **서버 세션 쿠키 유지** (Spring 내장 `HttpSession` + CORS credentials) | 섹션 3, 7, 15 |
| UI 컴포넌트/디자인 시스템 | **Tailwind CSS 단독** (컴포넌트 라이브러리 미사용, 커스텀 디자인 시스템) | 섹션 10, 15 |
| UI/UX 목표 | 기존 화면 "충실히 재현" → **완전 리뉴얼**로 목표 변경 | 섹션 1, 10 |

### 아직 미결인 항목

| 항목 | 내용 |
|---|---|
| 로그인 계정 방식 | 단일 설정값 계정 vs `t_mbr` 조회 포함 여부. 현재 계획: 설정값 단일 계정으로 우선 구현. `t_mbr` 존재 여부 검증은 선택적. (v1에서 이월) |
| `gvrnr_mng_sys_app_transaction` 테이블명 | 운영 DB 에서 실제 테이블명 확인 필요. (v1에서 이월) |
| **디자인 토큰/방향성** (신규) | 색상 팔레트, 타이포그래피, 레이아웃 컨셉이 아직 정해지지 않음. Phase 4 시작 전 별도 논의 필요 |
| **배포 토폴로지** (신규) | 운영 환경에서 프론트/백엔드를 동일 도메인(리버스 프록시)으로 묶을지, 완전 분리 도메인(HTTPS + SameSite=None)으로 배포할지 미정. 인프라 확인 필요 |
| Java/빌드 도구 버전 | Java 17 vs 21, Maven vs Gradle — 특별한 팀 컨벤션이 없다면 Java 17 LTS + Maven으로 진행 예정 (미확정, 이견 있으면 조정) |

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
| **IE11 지원** | 불필요 |
| **다중 페이지 라우팅** | 단일 페이지 앱 구조 유지 |
| **역할 기반 접근 제어 (RBAC)** | 단일 사용자 유형 |
| **Rollback 완전 복원** (기존 정압기 이전 통계) | 이전 통계 소멸로 복원 불가. 스냅샷 기능은 별도 마일스톤 |
| **Spring Security 풀스택 도입** (신규) | 1차 마일스톤은 단일 계정 + 세션 검증 필터로 충분. 인가(authorization) 체계가 필요해지면 별도 마일스톤에서 검토 |
| **다중 인스턴스 세션 클러스터링** (신규, 예: Spring Session JDBC/Redis) | 단일 인스턴스 배포 전제. 수평 확장이 필요해지면 별도 마일스톤에서 세션 스토어 재설계 |

---

## 18. 구현 승인 전 체크리스트

### 기술적 전제조건

- [ ] 로컬 PostgreSQL 에서 운영 DB 스키마 복원 완료 (또는 운영 DB 직접 접근 가능)
- [ ] `gvrnr_mng_sys_app_transaction` 실제 테이블명 운영 DB 에서 확인
- [ ] 로그인 계정 값 결정 (설정값 단일 계정)
- [ ] Java 버전 / 빌드 도구(Maven/Gradle) 확정
- [ ] 운영 배포 토폴로지 결정 (동일 도메인 리버스 프록시 vs 완전 분리 도메인)

### 미결 항목 확인

- [ ] 로그인 시 `t_mbr` 조회 포함 여부 결정
- [ ] Rollback 한계(기존 정압기 통계 복원 불가) 사용자 인지 및 동의
- [ ] **디자인 토큰(색상/타이포/레이아웃 컨셉) 확정** (신규)

### 계획 승인

- [ ] 이 계획(`docs/plan.md`) 전체 내용 검토 완료
- [ ] 1차 마일스톤 범위(섹션 11) 동의
- [ ] Out-of-Scope 항목(섹션 17) 동의
- [ ] 구현 순서(섹션 13) 동의
- [ ] **구현 시작 승인**
