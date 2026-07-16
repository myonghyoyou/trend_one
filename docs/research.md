# docs/research.md — 정압기 관리 시스템: Next.js 마이그레이션 리서치

> 이 문서의 모든 내용은 `c:\projects\gov_trend\docs\references\legacy\dssf\` 의 실제 소스 파일을 직접 열어 확인한 사실에 근거한다.
> 추측성 서술 없음. 모든 API URL, SQL 필드명, 함수명은 소스를 읽어 검증했다.

---

## 1. 현재 프로젝트 개요

### 프레임워크 / 라이브러리 스택

| 레이어 | 기술 | 버전 |
|---|---|---|
| 웹 프레임워크 | Django | 4.0.5 |
| 데이터베이스 | PostgreSQL | (psycopg2 경유) |
| 템플릿 엔진 | Django Template Language | — |
| ORM | Raw SQL (커스텀 `executeQuery`) + Django ORM (Transaction 모델 한정) | — |
| 엑셀 파싱 | pandas (`openpyxl` 엔진) | — |
| 프론트엔드 JS | jQuery | 3.6.0 (로컬) |
| UI 프레임워크 | Bootstrap | 5 (로컬 번들) |
| 차트 | Apache ECharts | 5.3.3 (CDN) |
| PDF 출력 | jsPDF | 2.5.1 (CDN) |
| HTML→PDF | html2pdf.js | 0.10.1 (CDN) |
| 인증 | 외부 SSO 토큰 DES-CBC 복호화 | — |
| 세션 백엔드 | Django sessions → uWSGI cache | TTL 90분 |

### 주요 폴더 구조

```
docs/references/legacy/dssf/
├── gvrnr_mng_sys/                 # Django 프로젝트 설정
│   ├── settings.py
│   ├── urls.py                    # 루트 URL 라우터
│   ├── wsgi.py
│   └── asgi.py
└── gvrnr_mng_sys_app/             # Django 애플리케이션
    ├── models/
    │   ├── common_model.py        # 파일 업로드 감사 로그 (raw SQL)
    │   ├── gvrnr_model.py         # 정압기 CRUD (raw SQL)
    │   ├── gvrnr_stat_model.py    # 통계 CRUD (raw SQL)
    │   └── transaction_model.py   # 트랜잭션 추적 (Django ORM)
    ├── views/
    │   ├── base_view.py           # 인증/세션 진입 뷰
    │   ├── gvrnr_view.py          # 주요 비즈니스 로직 뷰
    │   └── transaction_view.py    # 트랜잭션 관리 뷰
    ├── util/
    │   ├── database_util.py       # Raw SQL 실행기
    │   └── common_util.py         # 세션 만료 체크
    ├── migrations/
    │   └── 0001_initial.py        # Transaction + VirtualTransaction 테이블
    ├── templates/
    │   ├── index.html             # SSO 릴레이 진입 페이지
    │   ├── main.html              # 메인 대시보드 (단일 페이지)
    │   ├── help_modal.html        # PDF 매뉴얼 도움말 모달
    │   └── _include/
    │       ├── hidden.html        # 숨김 폼 필드 파셜
    │       ├── js.html            # JS 라이브러리 로더 파셜
    │       ├── loader.html        # 로딩 스피너 파셜
    │       └── modals.html        # Alert/Confirm 모달 파셜
    └── static/
        ├── css/
        │   ├── main.css           # 커스텀 스타일시트
        │   └── bootstrap-*.css    # Bootstrap 벤더 CSS
        └── js/
            ├── main.js            # 핵심 클라이언트 비즈니스 로직 (794줄)
            ├── chart_handle.js    # ECharts 래퍼 + 스크롤/터치 (244줄)
            ├── common/
            │   ├── common.js      # 공통 유틸리티 (567줄)
            │   ├── modals.js      # 모달 개폐 핸들러 (151줄)
            │   └── loader.js      # 로딩 오버레이 (12줄)
            └── lib/bootstrap/     # Bootstrap JS 벤더 파일
```

### 라우팅 / 페이지 구조

루트 URL (`gvrnr_mng_sys/urls.py`) 은 앱 URL을 `/` 에 include한다:

| URL 패턴 | 뷰 클래스/함수 | HTTP 메서드 | 목적 |
|---|---|---|---|
| `/` | `base_view.index` (CBV) | GET, POST | SSO 릴레이 진입 |
| `/main/` | `base_view.main` (CBV) | GET, POST | 메인 대시보드 |
| `/getGvrnrList/` | `gvrnr_view.get_gvrnr_list` (CBV) | POST | 정압기 검색 |
| `/getGvrnrStats/` | `gvrnr_view.get_gvrnr_stats` (CBV) | POST | 압력 통계 조회 |
| `/gvrnrCRUD/` | `gvrnr_view.gvrnr_crud` (CBV) | POST | 엑셀 업로드 + CRUD |
| `/createTransaction/` | `transaction_view.create_transaction` (FBV) | POST | 트랜잭션 생성 |
| `/getTransactionsInProgress/` | `transaction_view.get_transactions_in_progress` (FBV) | POST | 진행 중 트랜잭션 목록 |
| `/rollabckAllTransactionsInProgress/` | `transaction_view.rollback_all_transactions_in_progress` (FBV) | POST | 전체 롤백 (**URL 오타 있음**) |

### 주요 도메인 / 기능

1. **인증** — 외부 SSO 릴레이 (Hyperion → DES-CBC 복호화 → Django 세션)
2. **정압기 검색** — 날짜 범위, 지역(서울/경기), 점검 요일, 이름 키워드로 필터링
3. **통계 조회** — 최대 3개 정압기 선택 → 시계열 압력 데이터 조회 → 차트 렌더링
4. **엑셀 업로드** — `.xlsx` 파일 업로드 → pandas 파싱 → 정압기 + 통계 행 upsert
5. **트랜잭션 추적** — 업로드 작업의 감사 추적 및 롤백 지원
6. **PDF 출력** — 대시보드 차트 영역의 HTML2PDF 스냅샷

---

## 2. 화면 및 기능 목록

### 화면 1: 진입 / SSO 릴레이 (`/` → `index.html`)

**목적:** 외부 Hyperion SSO 시스템에서 사용자 식별 정보를 Django 세션으로 전달한다.

**주요 구성 요소:**
- 단일 숨김 폼 (`<form name="contForm" action="/main/" method="POST">`)
- `<input type="hidden" name="user_id" value="{{ user_id }}">`
- `bad_request` 가 truthy일 때 Bootstrap 5 에러 모달 표시

**사용자 동작:**
- 없음 (수동 조작 불필요). `bad_request == "False"` 이면 페이지 로드 시 JS가 자동으로 폼을 submit한다.
- 오류 시: "잘못된 접근입니다. 하이페리온을 통해 접속해주세요." 알림 후 Hyperion SSO 로그아웃 URL로 리다이렉트: `https://dr.hanjinsc.com/WebSite/Login.aspx?LogOut=LogOut&isMobile=0`

**연관 API:**
- POST `/main/` — `user_id` (DES 암호화 또는 `"TEST"`) 수신

**연관 상태:**
- Django 템플릿 변수: `{{ user_id }}`, `{{ bad_request }}`

**인증 로직:**
- 두 뷰 모두 `@csrf_exempt` 적용
- `main.post()` 에서: `user_id` 를 DES-CBC (key=`b'h2h0i1c5'`, IV=`b'h2h0i1c5'`) 로 복호화, 제어문자 제거, `request.session["login_session"]` 및 `request.session["session_exists"] = True` 설정
- 우회: `user_id == "TEST"` 이면 복호화 없이 세션 직접 설정

**권한/역할:** 없음 — 유효한 암호화 ID를 가진 요청은 모두 인증된다.

---

### 화면 2: 메인 대시보드 (`/main/` → `main.html`)

**이 앱에서 유일한 실제 화면이다.**

#### 세부 기능 2a: 정압기 검색

**폼 필드:**
| 필드 ID | 타입 | name 속성 | 기본값 | 비고 |
|---|---|---|---|---|
| `startDate` | date input | `startDate` | `2024-07-01` | JS에서 최대 30일 범위 강제 |
| `endDate` | date input | `endDate` | `2024-07-30` | `window.onload` 에서 오늘로 덮어씀 |
| `srchCity` | select | `srchCity` | `"3100"` (경기) | 선택지: `"3100"` 경기, `"1100"` 서울 |
| `inspctDay` | select | `inspctDay` | — | 선택지: MON/TUE/WED/THU/FRI |
| `srchCntnt` | text | `srchCntnt` | — | 정압기명 키워드 |

**사용자 동작:**
- `#srch-btn` 클릭 → `goSrch()` → AJAX POST `/getGvrnrList/`
- 결과는 `tbody.gvrnr-table-body` 에 체크박스 행으로 렌더링 (최대 3개 선택, `chkboxCnt` 로 제한)

**체크박스 데이터:**
```html
<input type="checkbox" id="gvrnrCheckbox" name="{{governor_name}}" value="{{gvrnr_uid}}">
```

**API:** POST `/getGvrnrList/`
- 요청: `startDate`, `endDate`, `inspctDay`, `srchCity`, `srchCntnt` (모두 선택적 문자열, `FormData` 로 전송)
- 응답: `{ resCd: "0000", resMsg: "검색이 완료되었습니다.", gvrnrList: [{gvrnr_uid, gvrnr_nm, inspct_day, gvrnr_stat_cnt, cd_name}] }`
- 세션 오류: `{ resCd: "0002", resMsg: "세션이 만료되었습니다." }`

---

#### 세부 기능 2b: 통계 조회 / 차트

**사용자 동작:**
- 검색 결과에서 최대 3개 체크박스 선택
- `#inquire-btn` 클릭 → `goInquire("NEWLIST")` → AJAX POST `/getGvrnrStats/`
- `#interval-sel` 에서 간격 선택 (선택지: `""`, `"20"`, `"30"`, `"40"` 분) → `goInquire("REFRESH")`

**제출 전 동적으로 설정되는 숨김 필드:**
| 필드 ID | 내용 |
|---|---|
| `gvrnrUids` | 체크박스에서 선택된 정압기 UID (쉼표 구분) |
| `gvrnrNms` | 정압기명 (쉼표 구분) |
| `intervalNum` | `#interval-sel` 셀렉트 값 |
| `mbrUid` | Django 컨텍스트의 `{{ user_id }}` |

**API:** POST `/getGvrnrStats/`
- 요청: `startDate`, `endDate`, `gvrnrUids` (쉼표 구분), `gvrnrNms` (쉼표 구분), `intervalNum` (기본값 1)
- 응답:
```json
{
  "resCd": "0000",
  "xAxisList": ["2024-07-01 00:00:00", "2024-07-01 00:01:00", "..."],
  "statDataObj": {
    "gvrnr_uid_1": {
      "gvrnr_nm": "정압기 이름",
      "record_dttm": ["..."],
      "gvrnr_press1": ["..."],
      "gvrnr_press2": ["..."],
      "gvrnr_press2_chart": [[timestamp, value], "..."],
      "gvrnr_trnsps1": ["..."],
      "gvrnr_trnsps2": ["..."]
    }
  }
}
```

**차트 렌더링:**
- `<div id="myChart">` 에 ECharts 라인 차트
- 선택한 정압기당 최대 3개 시리즈
- X축: `xAxisList` 의 타임스탬프
- Y축: 압력값 (`gvrnr_press2`), 데이터 범위 초과 시 제외하고 1.7–3.0으로 고정
- 커스텀 스크롤: 마우스 휠 1회당 뷰포트 25개 데이터 포인트 이동 (윈도우 크기 500)
- 커스텀 터치: 좌우 드래그로 패닝

**데이터 테이블:** `#result-table-body` — 컬럼: 측정일, 2차 압력 (정압기별)

**요약 테이블:** `.result-stat-wrapper` 내 동적으로 생성되는 테이블 3개, 정압기별 MIN/AVG/MAX 표시

---

#### 세부 기능 2c: 엑셀 업로드

**사용자 동작:**
- `#upload-btn` 클릭 → 숨겨진 `<input type="file" id="upload_files" accept=".xlsx,.xls">` 트리거
- 파일 선택 → `csvFileUpload()` → AJAX POST `/gvrnrCRUD/`

**예상 엑셀 파일 형식:**
- 여러 시트, 각 시트명은 한국어 요일 (화요일, 수요일 등)
- 각 시트: 0번 컬럼 = datetime, 나머지 컬럼 = 정압기 측정값
- 컬럼 헤더 형식: `"지역.정압기명"` (`.` 으로 분리)
- 지역 판별: 컬럼명에 `"경기"` 포함 시 `cate_cd = "3100"`, 아니면 `"1100"` (서울)

**API:** POST `/gvrnrCRUD/` (multipart/form-data)
- 요청: `mbrUid`, `upload_files` (파일)
- 응답: `{ resCd: "0000"|"0001"|"0002", resMsg: "..." }`
- 오류 코드: `"0001"` = 데이터/형식 오류, `"0002"` = 세션 만료

**백엔드 처리 순서:**
1. `session_end_check_handler(request)` — 유효한 세션 없으면 `TimeoutError` 발생
2. pandas로 엑셀 파일 읽기
3. 시트/정압기별: 기존 여부 확인 (`Gvrnr_model.getGvrnrList()`), 없으면 삽입 (`insGvnr()`), 기존 통계 삭제 (`delGvrnrStat()`), 새 통계 삽입 (`insGvrnrStat()`)
4. `Common_model.insFileUploadLog()` 로 `t_file_upload_log` 에 로그 기록
5. 전체 `@transaction.atomic` 으로 감싸짐

---

#### 세부 기능 2d: 트랜잭션 관리 (백엔드 전용)

UI 없음. 파일 업로드 시 롤백 지원을 위해 내부적으로 사용된다.

- **생성:** POST `/createTransaction/` → `Transaction.objects.create(status="pending")` → `transaction_id` (UUID) 반환
- **진행 중 목록:** POST `/getTransactionsInProgress/` → `status__in=["pending", "in_progress"]` 필터
- **전체 롤백:** POST `/rollabckAllTransactionsInProgress/` (URL 오타: "rollabck") → 연관 정압기/통계 레코드 atomic 삭제 + 상태를 cancelled로 변경

**⚠️ 위험:** `rollback_all_transactions_in_progress` 에서 `Gvrnr_model.objects.filter(transaction_id=...)` 와 `Gvrnr_stat_model.objects.filter(transaction_id=...)` 를 참조하지만, 이 모델들은 raw SQL 클래스로 `transaction_id` 필드가 정의되어 있지 않다. 이 코드는 의도대로 동작하지 않을 가능성이 높다.

---

#### 세부 기능 2e: 세션 / 인증 상태

**세션 키:**
- `request.session["login_session"]` — 평문 사용자 ID 문자열
- `request.session["session_exists"]` — boolean `True`

**만료 동작:**
- `SESSION_COOKIE_AGE = 5400` (90분)
- `SESSION_SAVE_EVERY_REQUEST = True` (슬라이딩 윈도우)
- AJAX 호출 시: `session_end_check_handler()` 가 `session_exists == None` 확인 → `TimeoutError` 발생
- 모든 비즈니스 뷰는 `TimeoutError` 발생 시 `{ resCd: "0002" }` 반환

**로그아웃:** `logout()` JS 함수는 DOM 요소의 표시/숨김만 처리한다. 서버 측 세션 삭제 호출은 소스에서 발견되지 않았다.

**역할 기반 접근 제어 없음.** 단일 사용자 유형만 존재하며, `hidden.html` 에 `mem_type` 컨텍스트 변수가 있지만 어떤 접근 제어 로직에도 사용되지 않는다.

---

## 3. 데이터 흐름

### 3a. API 요청/응답 흐름

```
클라이언트 (jQuery FormData)
  │
  ├── ajaxCrudOnSubmit(formName, url)
  │     └── $.ajax({ type: "POST", data: FormData, processData: false, contentType: false })
  │
  └── 서버 (Django 뷰, @csrf_exempt)
        ├── session_end_check_handler() → TimeoutError 발생 → { resCd: "0002" }
        ├── 비즈니스 로직 (model.rawSqlMethod())
        │     └── executeQuery(sql, returnType) → dictfetchall/dictfetchone
        └── HttpResponse(json.dumps(result))

클라이언트: jsonCompResult(resJson) 응답 파싱
  ├── resCd == "0000" → DOM에 결과 렌더링
  ├── resCd == "0001" → openAlert(resMsg, "FAIL")
  └── resCd == "0002" → 세션 만료 알림
```

모든 응답 코드는 `{ resCd, resMsg, ...data }` 패턴을 따른다.

### 3b. 폼 초기화 흐름

```
window.onload()
  ├── initializeChart() — 빈 옵션으로 echarts.init('#myChart') 생성
  ├── 날짜 기본값 설정: endDate = 오늘, startDate = 7일 전
  └── 이벤트 리스너 연결 (업로드 버튼, 간격 셀렉터)
```

페이지 로드 시 정압기 목록을 미리 불러오지 않는다. 사용자가 직접 검색을 실행해야 한다.

### 3c. 저장/수정 흐름 (엑셀 업로드)

```
사용자가 .xlsx 파일 선택
  → csvFileUpload() 가 PROC_CHK = "INS" 설정
  → ajaxCrudOnSubmit("contForm", "/gvrnrCRUD/")
  → openLoader("파일 업로드 중...")
  → POST /gvrnrCRUD/ (multipart)
      → @transaction.atomic
      → pandas read_excel (openpyxl 엔진)
      → 시트별: 파싱, 검증, 정압기 upsert, 기존 통계 삭제, 새 통계 삽입
      → insFileUploadLog()
  → 응답: { resCd, resMsg }
  → closeLoader()
  → openAlert("업로드가 완료되었습니다.", "SUCCESS") 또는 에러 모달
```

### 3d. 오류 처리 흐름

```
서버 측 오류 응답:
  { resCd: "0001", resMsg: "구체적인 오류 메시지" }   ← 데이터/형식 오류
  { resCd: "0002", resMsg: "세션이 만료되었습니다." }  ← 세션 타임아웃

클라이언트 측 (jsonCompResult):
  resCd != "0000" → openAlert(resMsg, "FAIL")

예외 매핑 (gvrnr_view.py):
  TimeoutError        → resCd "0002"
  UnicodeDecodeError  → resCd "0001" (UTF-8 필요)
  ValueError          → resCd "0001" (행/열 인덱스 포함)
  TypeError           → resCd "0001" (잘못된 데이터 타입)
  Exception (일반)    → resCd "0001"
```

### 3e. 로딩 / 빈 상태

**로딩:**
- `openLoader(text)` — `.loader-body` 오버레이 표시 (전체 화면, 75% 검정, 스피너)
- `closeLoader()` — 오버레이 숨김
- 모든 AJAX 요청 전후에 호출된다

**빈 상태:**
- 별도의 빈 상태 UI 없음. `gvrnrList` 가 비어 있으면 `tbody.gvrnr-table-body` 에 행이 없는 상태로 렌더링된다.
- "결과 없음" 메시지는 현재 구현에 존재하지 않는다.

---

## 4. Next.js 마이그레이션 노트

### 4a. Next.js 라우트 구조 (안)

```
src/app/
├── layout.tsx                    # 루트 레이아웃 (폰트, 글로벌 스타일, 모달 프로바이더)
├── page.tsx                      # /dashboard 또는 /auth 로 리다이렉트
├── auth/
│   └── page.tsx                  # SSO 릴레이 페이지 (index.html 대체)
├── dashboard/
│   └── page.tsx                  # 메인 대시보드 (main.html 대체)
└── api/
    ├── governors/
    │   ├── list/route.ts         # POST /getGvrnrList/
    │   └── stats/route.ts        # POST /getGvrnrStats/
    ├── crud/
    │   └── route.ts              # POST /gvrnrCRUD/ (multipart)
    └── transactions/
        ├── create/route.ts       # POST /createTransaction/
        ├── in-progress/route.ts  # POST /getTransactionsInProgress/
        └── rollback/route.ts     # POST /rollabckAllTransactionsInProgress/
```

현재 앱은 사실상 **단일 페이지 애플리케이션(SPA)** 이다. `/dashboard` 라우트 하나에 모든 대시보드 UI를 React 컴포넌트로 구성한다.

### 4b. Client Component vs Server Component 판단

| 컴포넌트 | 권장 | 이유 |
|---|---|---|
| 대시보드 페이지 래퍼 | Server Component | 초기 레이아웃, 폰트 로딩 |
| 검색 필터 폼 | Client Component | 제어 입력, 이벤트 핸들러 |
| 정압기 목록 테이블 | Client Component | 동적 체크박스 상태, 사용자 인터랙션 |
| 통계 차트 | Client Component | ECharts 명령형 API, DOM ref, 스크롤 이벤트 |
| 요약 통계 테이블 | Client Component | API 응답 기반 동적 렌더링 |
| 압력 데이터 테이블 | Client Component | API 응답 기반 동적 행 |
| 로더 오버레이 | Client Component | 명령형 표시/숨김 |
| Alert/Confirm 모달 | Client Component | 이벤트 기반 |
| 도움말 모달 | Client Component | 사용자 동작으로 토글 |
| Auth 릴레이 페이지 | Client Component | 자동 폼 submit 동작 |

**모든 인터랙티브 컴포넌트는 Client Component여야 한다.** 메인 대시보드 전체가 인터랙션 집중 구조다. Server Component는 레이아웃 쉘과 정적 래퍼에만 적용된다.

### 4c. API 레이어 전략

**권장:** Next.js Route Handler (`app/api/.../route.ts`) 가 Django 엔드포인트를 직접 대체한다.

- 각 route handler는 `FormData` 또는 JSON을 수신하고, 입력을 검증하고, DB 쿼리를 실행하고, JSON을 반환한다.
- raw SQL f-string 보간을 **파라미터화 쿼리** (`node-postgres` / `pg` 라이브러리 또는 Prisma) 로 대체한다.
- 데이터베이스는 PostgreSQL 그대로 유지한다.
- `executeQuery()` 추상화 (`getOne`, `getList`, `INSERT`, `DELETE`) 는 Node.js 타입화 쿼리 래퍼로 자연스럽게 이식된다.

**Next.js API 라우트에서 DB에 직접 접근하는 것이 적절한 이유:**
- 별도 백엔드 서비스 없음 (모노리스)
- 현재 Django 뷰는 SQL 위의 얇은 CRUD 래퍼
- 트랜잭션 로직이 단순하여 Node.js pg 트랜잭션으로 충분

**엑셀 파싱:** 서버 측에서 `pandas` 를 `xlsx` 또는 `exceljs` npm 패키지로 대체한다.

### 4d. 상태 관리 전략

**권장: React state + URL params (전역 스토어 불필요)**

현재 앱의 상태는 최소 수준이다:

| 현재 변수 | 마이그레이션 대상 |
|---|---|
| `PROC_CHK` 문자열 플래그 | 진행 중인 API 호출 유형으로 파생 |
| `gvrnrUids` / `gvrnrNms` | Dashboard 컴포넌트의 React state |
| `press2Data` / `press2ChartData` | API 응답 기반 React state |
| `myChart` ECharts 인스턴스 | `useRef` |
| `xAxisList` | API 응답 state의 일부 |
| `chkboxCnt` (최대 3 선택) | `selectedGovernors.length` 로 파생 |
| 검색 폼 값 | React 제어 입력 또는 `useForm` |

Zustand/Redux 불필요. Dashboard 레벨의 `useState` + `useReducer` 로 충분하다.

다음 용도에는 `React Query` (`@tanstack/react-query`) 도입을 고려한다:
- 정압기 목록 결과 캐싱
- 로딩/에러 상태 관리
- 간격 변경 시 자동 refetch

### 4e. 폼 처리 전략

**권장: React Hook Form + Zod**

`common.js` 에서 복제해야 할 검증 로직:
- 날짜 범위 최대 30일 (`getDateDiff(day1, day2, "DAY") > 30`)
- 텍스트 입력 특수문자 불허 (`CheckHasSpecialChar`, 정규식: `/[~!@#$%^&*()_+|<>?:{}]/`)
- 파일 타입 검증 (`accept=".xlsx, .xls"`)

**파일 업로드:** Client Component에서 `input[type=file]` 과 `FormData` API 사용. API 라우트는 `request.formData()` 로 수신한다.

**숨김 필드** (`hidden.html` 의 `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type`): 현재 비즈니스 로직에서 사용되지 않는 것으로 보인다. 이들은 어떤 뷰에서도 채워지지 않는 Django 컨텍스트 변수에 바인딩된다. 확인 후 **제거 가능** 하다.

### 4f. 인증 / 권한 처리 전략

**현재 흐름:**
1. 외부 Hyperion SSO → `user_id` (DES-CBC 암호화) 를 POST로 `/` → `/main/` 전송
2. Django에서 복호화 후 세션에 저장
3. 모든 뷰에서 `session_exists` 세션 키 확인

**Next.js 마이그레이션 방안:**

**Option A (충실한 재현 — 권장):** 동일한 SSO 릴레이 패턴 유지
- `/auth` 페이지가 Hyperion으로부터 POST/쿼리 파라미터로 `user_id` 수신
- 서버 측: Node.js `crypto` 모듈 또는 `node-forge` 로 DES-CBC 복호화
- **httpOnly JWT 쿠키** 또는 Next.js `iron-session` 쿠키 발급
- 모든 API 라우트에서 쿠키 검증
- `/dashboard` 페이지: `cookies()` 를 통한 서버 측 세션 확인

**Option B (재설계 — 승인 필요):** OAuth/OIDC 흐름으로 교체
- **명시적인 이해관계자 승인 없이 시도하지 말 것.** Hyperion URL (`dr.hanjinsc.com`) 은 운영 외부 의존성이다.

**세션 만료:** 90분 슬라이딩 Django 세션을 JWT 만료 클레임으로 대체. API 라우트는 토큰 만료 시 기존 `{ resCd: "0002" }` 패턴 또는 HTTP 401을 반환한다 (HTTP 상태 코드 방식으로 전환 권장).

**역할 기반 접근 제어 없음.** 단일 사용자 유형. 권한 미들웨어 불필요.

### 4g. 공통 UI / 컴포넌트 전략

**권장 컴포넌트 라이브러리: shadcn/ui** (Bootstrap과 유사한 디자인 언어) + Tailwind CSS

| 현재 컴포넌트 | Next.js 대안 |
|---|---|
| Bootstrap 5 modal (Alert) | shadcn `<AlertDialog>` 또는 커스텀 Modal |
| Bootstrap 5 modal (Confirm) | OK/Cancel이 있는 shadcn `<AlertDialog>` |
| Bootstrap 5 Dropdown | shadcn `<DropdownMenu>` |
| jQuery 로더 오버레이 | React portal + CSS backdrop |
| ECharts 차트 | `echarts-for-react` 래퍼 또는 `useEffect` + `echarts.init` 직접 사용 |
| HTML2PDF 출력 | `html2pdf.js` 또는 `@react-pdf/renderer` |
| Bootstrap 그리드 | Tailwind grid/flex |
| Pretendard 폰트 | `next/font/local` |

**ECharts 유지 (recharts/nivo 전환 불가):** `chart_handle.js` 의 커스텀 스크롤/터치 줌 동작은 비트리비얼하다. ECharts 네이티브 `dataZoom` 컴포넌트로 해당 커스텀 코드 대부분을 대체할 수 있다.

---

## 5. 위험 요소 및 불확실성

### 5a. 확인되지 않은 정보 / 검증 필요 항목

| 항목 | 위험도 | 비고 |
|---|---|---|
| `t_region_cd` 테이블 스키마 | 중간 | SQL JOIN에서 참조되지만 어떤 모델/마이그레이션에도 정의되지 않음. 내용 미상. |
| `t_governor` 테이블 스키마 | 낮음 | SQL에서 추론 가능하지만 CREATE TABLE 구문 없음. |
| `t_file_upload_log` 테이블 스키마 | 낮음 | INSERT SQL에서 추론 가능. |
| `VirtualTransaction` 모델 | 중간 | 마이그레이션에서 생성되지만 뷰/모델 어디에서도 참조되지 않음. 목적 미상. |
| `workDiv`, `initSetLeng`, `tSrch`, `mem_type` | 중간 | 템플릿 숨김 필드이지만 **어떤 뷰에서도 채워지지 않음**. 데드 코드이거나 마이그레이션되지 않은 기능일 수 있음. |
| Hyperion SSO 요청 형식 | 높음 | 암호화 `user_id` 복호화 로직은 명확하지만, Hyperion의 **정확한 POST 요청 형식** (필드명, 인코딩)은 `request.POST.get("user_id")` 와 `request.POST.get("userid")` (**index와 main 뷰 간 필드명 불일치**) 에서만 추측 가능하다. 추가 확인 필요. |
| 실제 운영 DB 스키마 | 높음 | `0001_initial.py` 는 Transaction 테이블만 생성한다. 비즈니스 테이블(`t_governor`, `t_governor_stat`, `t_region_cd`, `t_file_upload_log`)은 존재해야 하지만 **어떤 마이그레이션에도 없다**. 운영 DB에서 스키마를 직접 확인해야 한다. |
| 엑셀 파일 컬럼 형식 | 중간 | `"지역.정압기명"` 형식은 코드 분석에서 추론한 것이며, 실제 샘플 파일은 확인되지 않음. 추가 확인 필요. |
| `jsPDF` 사용 여부 | 낮음 | CDN으로 import되고 `savePDF()` 함수가 존재하지만, 이를 호출하는 UI 버튼은 없음. 데드 코드로 추정. |

### 5b. 인간 확인이 필요한 항목

1. **Hyperion SSO 연동:** 새 Next.js 엔드포인트를 외부 Hyperion 시스템에 알려야 하는가? `user_id` 필드명이 `"userid"` (index) 인가 `"user_id"` (main) 인가 — 소스에서 다르다. 어느 것이 정확한가?
2. **트랜잭션 롤백 설계:** 롤백 로직 (`rollback_all_transactions_in_progress`) 이 실제로 동작한 적 있는가? 마이그레이션 대상에 포함해야 하는가?
3. **로그아웃 동작:** 현재 `logout()` JS 함수는 DOM 요소만 숨긴다. 서버 측 세션 삭제 호출이 없다. 의도된 설계인가 (SSO가 세션 생명주기를 관리하는가)?
4. **URL 오타 `rollabck`:** 외부 시스템이 이 URL을 호출하는 경우 그대로 유지해야 하는가, 수정해도 되는가?
5. **숨김 필드 범위:** `workDiv`, `initSetLeng`, `tSrch`, `mem_seq`, `mem_type` 이 데드 코드임을 제거 전에 확인해야 한다.
6. **`"TEST"` 우회:** `user_id == "TEST"` 우회가 개발 전용인가? Next.js에서도 유지해야 하는가?
7. **PDF 매뉴얼 경로:** `help_modal.html` 이 `/resource/manual/gtms_manual.pdf#page=N` 로 링크한다. 운영 환경에서 이 파일은 어디서 서빙되는가?

### 5c. 기존 동작이 불명확한 영역

1. **인증 흐름 불일치:** `index.html` 은 GET 요청 시 `user_id="TEST"` 로 렌더링된다. `bad_request` 로직은 truthy `bad_request` 일 때만 Hyperion으로 리다이렉트한다. `bad_request=True` 가 설정되는 정확한 조건은 모든 코드 경로를 추적하지 않고는 불명확하다. 추가 확인 필요.
2. **최대 3개 정압기 선택:** JS (`chkboxCnt`) 에서만 강제된다. 서버 측 강제 없음. 서버에서 이를 위반했을 때의 동작은 정의되지 않는다.
3. **`intervalNum` 기본값:** 뷰는 1분 간격을 기본값으로 사용한다. UI select의 기본값은 `""` (간격 없음). 이 불일치로 인해 기본 쿼리가 매 분 단위 데이터를 가져와 잠재적으로 수천 행이 반환될 수 있다.
4. **`generate_series()` 쿼리 성능:** 통계 쿼리는 생성된 시리즈와 정확한 타임스탬프 동등 비교로 JOIN한다. 측정 타임스탬프가 간격에 정확히 정렬되지 않으면 행이 조용히 누락된다. 데이터 무결성 우려 사항이다.
5. **SQL Injection:** 모든 쿼리가 사용자 입력과 f-string 보간을 사용한다. 마이그레이션 시 파라미터화 쿼리로 전면 교체해야 하며, 엣지 케이스 입력에 대한 정확한 동작이 변경될 수 있다.

### 5d. 승인 없이 재설계하지 말아야 할 영역

1. **DES-CBC 인증 복호화 로직** — Hyperion의 암호화와 정확히 일치해야 한다.
2. **`/gvrnrCRUD/` 엑셀 시트 형식 파싱** — 엑셀 컬럼 명명 규칙 (`지역.정압기명`) 은 외부 데이터 제공자가 정의한다.
3. **응답 코드 체계 (`resCd: "0000"`/`"0001"`/`"0002"`)** — Hyperion 또는 다른 시스템이 이를 확인하는 경우, HTTP 상태 코드 방식으로의 전환은 협의가 필요하다.
4. **지역 코드 매핑 (`"3100"` → 경기, `"1100"` → 서울)** — `t_region_cd` 의 외래 키 값이다. 변경 불가.
5. **점검 요일 값 (MON/TUE/WED/THU/FRI)** — `t_governor.inspct_day` 에 저장된다. 변경 불가.
6. **`generate_series()` 쿼리 로직** — 시계열 정렬 동작은 결함이 있더라도 명시적으로 재설계될 때까지 동일하게 복제해야 한다.

---

## 6. 계획 경계 제안

### 6a. 첫 번째 마이그레이션 계획의 범위 내

1. **Next.js 프로젝트 스캐폴드** — TypeScript, Tailwind, App Router로 `create-next-app`
2. **Auth 릴레이 페이지** (`/auth`) — `index.html` 동작 복제: `user_id` 수신 → Next.js API로 POST하여 복호화 + 세션 생성
3. **세션 관리** — Django 세션을 `iron-session` 또는 httpOnly JWT 쿠키로 대체
4. **대시보드 페이지** (`/dashboard`) — `main.html` 을 React 컴포넌트로 전체 이식:
   - 검색 필터 폼 (제어 입력, Zod 검증)
   - 체크박스 선택이 있는 정압기 목록 테이블 (최대 3개)
   - ECharts 차트 통합 (네이티브 `dataZoom` 으로 커스텀 스크롤 코드 대체)
   - 압력 데이터 테이블 (동적 행)
   - MIN/AVG/MAX 요약 테이블
   - 로더 오버레이 컴포넌트
   - Alert/Confirm 모달 컴포넌트
   - PDF 링크가 있는 도움말 모달
5. **API 라우트 (5개 비즈니스 엔드포인트 전체):**
   - `POST /api/governors/list` — 파라미터화 SQL로 검색
   - `POST /api/governors/stats` — 파라미터화 SQL로 통계
   - `POST /api/crud` — 엑셀 업로드 (multipart, `exceljs` 또는 `xlsx`)
   - `POST /api/transactions/create`
   - `POST /api/transactions/in-progress`
   - `POST /api/transactions/rollback`
6. **데이터베이스 레이어** — 파라미터화 쿼리를 사용하는 직접 `pg` (node-postgres); ORM 불필요
7. **Pretendard 커스텀 폰트** — `next/font/local` 사용

### 6b. 첫 번째 계획에서 명시적으로 제외되는 범위

1. **데이터베이스 스키마 변경** — PostgreSQL 테이블 (`t_governor`, `t_governor_stat`, `t_region_cd`, `t_file_upload_log`) 은 변경 불가. Next.js는 기존 스키마로 동작해야 한다.
2. **인증 재설계** — OAuth/OIDC 교체 없음. DES-CBC 릴레이 로직 유지.
3. **`jsPDF` / `savePDF` 기능** — UI 트리거 없음; 달리 확인되지 않는 한 데드 코드로 처리.
4. **Django 관리자 패널** — 마이그레이션 대상 아님.
5. **트랜잭션 롤백 기능 재설계** — 비정상적인 롤백 로직은 구조적으로만 이식하되, DB 레벨 롤백이 비동작임을 명시하는 코드 주석을 추가한다.
6. **멀티 페이지 라우팅** — 앱이 사실상 단일 페이지이므로 추가 라우트 불필요.
7. **역할 기반 접근 제어** — 역할이 존재하지 않음; 설계하지 않음.
8. **`VirtualTransaction` 모델** — 목적 미상; 마이그레이션에서 제외.
9. **RTL CSS 변형** (Bootstrap RTL 파일) — 한국어 전용 앱이므로 RTL 파일 제거.
10. **IE11 브라우저 감지 블록** — 최신 Next.js 앱에는 불필요.
11. **URL 오타 수정** (`rollabck`) — 외부 시스템이 이 URL을 호출하는 경우 협의 후 수정; 현재는 보류.
