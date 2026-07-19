# UI 컴포넌트 동기화 — 인벤토리 & 갭 분석

> 목표: CNTO_APP과 **최대한 같은 컴포넌트 세트/관례**를 쓰되, 개선이 필요한 부분은 개선하며 정렬한다.
> 동기(動機): 특정 신규 화면 수요가 아니라 **전체 코드 일관성**.
> 원칙: CNTO는 bootstrap+scss+twin.macro+styled-components 스택이라 **포팅 불가 → Tailwind 관용구로 재구현**. 화면 수요 없는 블랭킷 포팅 금지(YAGNI).

## 규모

- CNTO 공용 컴포넌트: **70개** (`src/components/` 하위 폴더 포함)
- trend_one: 공용 `components/ui/` **5개** + 화면 전용 9개
- 현재 화면: **로그인 + 대시보드 2개**

## A. 있음 → 관례만 정렬 (재구현 아님)

| trend_one | CNTO 대응 | 정렬 포인트 |
|---|---|---|
| `ui/Button` | `Button` (+`LoadingButton`) | variant/size/loading prop API 정렬, 로딩버튼 패턴 흡수 |
| `ui/Select` | `SelectMenu`/`SelectOptions` | trend_one은 native select(더 단순·권장). prop 관례만 정렬 |
| `ui/Loader` | `Spinner` | 네이밍/포털 방식 정렬 |
| `ui/AlertModal`+`ConfirmModal`+`ModalContext` | `Modal`+`ContentModal`+`useModal` | openAlert/openConfirm ↔ useModal API 정렬 |

## B. 인라인 → 추출 (현재 화면이 이미 쓰는데 컴포넌트가 없음) ★핵심

| 현재 인라인 | 위치 | CNTO 대응 | 우선순위 |
|---|---|---|---|
| native `<input>` (동일 Tailwind 클래스 반복) | LoginForm×2, SearchForm×3 | `TextInput` | **P1** |
| label+input+error `<p>` 블록 반복 | 위 전부 | `Field`/`LabelInput` + `ErrorMessage` | **P1** |
| checkbox `<input>` | GovernorTable | `Checkbox` | P2 |
| file `<input>` | ExcelUpload | `file/upload/UploadButton` | P2 |
| Button disabled + "…중" 패턴 | LoginForm/LogoutButton/ExcelUpload | `LoadingButton` | P2 |
| native `<table>` | GovernorTable, DataTable | `GridTable`/`table/EditTable` | P3 |

## C. 신규(일관성) — 선별

- `ErrorMessage`: 에러 `<p>` 중복 → P1과 함께 추출 시 값쌈
- `Badge`/`Chip`/`Card`/`Divider`/`layout/*`: 현재 화면 수요 약함 → **보류**

## D. 스킵 (수요 발생 시) — 약 45개

`ActionMenu, AnchorMenu*, Drawer, Datepicker/CustomHeaderDatePicker, Dropdown, RadioButton, TextArea, SelectableChips, Tab, EditTable, DaeryunGrid, grid/*, ReportModal 계열, SessionTimer, Logo, Footer, TextBanner, ResultPanel, InputNameBox, FormattedTextInput, SearchFilter, MultiFileDropper, form/*, file/item/*, layout/*` — 2개 화면에 수요 없음.

## 핵심 결론

1. **일관성의 실익은 "폼 프리미티브"에 집중.** `TextInput` + `Field(label+error)` + `ErrorMessage`가 P1인 이유: 현재 5곳에 동일한 input Tailwind 클래스가 복붙돼 있음(`SearchForm`은 `px-2 py-1.5`, `LoginForm`은 `px-3 py-2`). 중복 제거 + CNTO 관례 정렬 효과가 즉시 큼.
2. **CNTO `GridTable`(85KB)은 포팅 금지.** 거대·복잡(가상화/정렬/페이지네이션). trend_one의 단순 `<table>`을 **경량 자체 `Table` 프리미티브로 개선 정렬**한다.

## 사전 토대 (컴포넌트 착수 전 1회)

- `cn()`/clsx 헬퍼 — 변형 많은 컴포넌트의 조건부 클래스 표준화 (CNTO도 clsx 사용)
- 경로 alias `@/` — 컴포넌트 다수 추가/이동 시 상대경로 churn 감소

## 진행 순서(안)

1. 토대: `cn()` 헬퍼 + `@/` alias
2. **P1**: `TextInput` + `Field` + `ErrorMessage` (폼 프리미티브 추출·정렬)
3. **P2**: `Checkbox`, `LoadingButton`, `UploadButton`, 경량 `Table`
4. **P3/보류**: GridTable(비권장), D 목록(수요 시)

## 진행 결과 (2026-07-19)

- ✅ 토대: `cn()` 헬퍼(clsx + tailwind-merge) 도입. `@/` alias는 미진행(독립 스텝으로 보류).
- ✅ **P1**: `TextInput`/`Field`/`ErrorMessage` 도입, LoginForm·SearchForm 전환.
- ✅ **P2**: `Checkbox` + 경량 **`DataGrid`**(CNTO `DaeryunGrid`의 columnDefs 개념 축소 차용, 정렬/페이지네이션 제외)로 GovernorTable·DataTable 전환. `Button`에 `loading` prop 추가 후 제출 버튼 적용.
- ⏭️ **UploadButton**: 보류(소비자 1곳, YAGNI). ExcelUpload는 현행 유지.
- ⏭️ **A(있음→관례 정렬)**: 스킵. CNTO의 styled-components API 포팅은 bloat, 이름만 맞춤은 churn → 실이득 없음. trend_one 버전이 이미 Tailwind/RHF-native로 더 단순.

## 참고

- 디자인 토큰(색/타이포/레이아웃)은 `docs/todo.md`에서 "임시 초안, 확정 아님"으로 표기됨. 일관성 목표엔 팔레트 변경 불필요하므로 현재 초안(brand blue + slate) 위에서 진행 가능. 비주얼까지 CNTO에 맞출 경우에만 토큰 선행 결정 필요.
- 백엔드 미구현으로 로그인 이후 실동작 미검증. UI 작업은 목업으로 진행/검증 가능(하드 블로커 아님).
