# 정압기 트렌드 관리 시스템 — DB 스키마 문서

> PostgreSQL 기준. ERD 다이어그램을 기반으로 작성했으며, 외래키(FK) 관계는 다이어그램에 연결선이 명시되어 있지 않아 **컬럼 명명 규칙을 토대로 추정**한 부분을 별도 표기했습니다.

## 개요

| 객체 | 종류 | 설명 |
|------|------|------|
| `t_mbr` | TABLE | 회원(사용자) 정보 |
| `t_region_cd` | TABLE | 지역 카테고리 코드 (계층 구조) |
| `t_governor` | TABLE | 정압기 마스터 정보 |
| `t_governor_stat` | TABLE | 정압기 측정 트렌드 데이터 (대용량, 계속 적재) |
| `t_file_upload_log` | TABLE | 파일 업로드 이력 |
| `view_governor_stat` | VIEW | 정압기 측정값 조회용 뷰 |

공통 감사(audit) 컬럼: 대부분의 테이블이 `rgst_dttm`(등록일시) / `rgst_uid`(등록자 사번) / `updt_dttm`(수정일시) / `updt_uid`(수정자 사번)를 공유합니다. `*_uid` 사번 컬럼은 모두 `t_mbr.mbr_uid`를 참조하는 것으로 보입니다(추정).

---

## t_mbr — 회원 테이블

| 컬럼 | 타입 | 키 | 설명 |
|------|------|----|------|
| `mbr_uid` | varchar(20) | PK | 회원 사번 |
| `mbr_nm` | varchar(20) | | 회원 이름 |
| `last_login_dttm` | timestamp | | 최종 접속일자 |
| `rgst_dttm` | timestamp | | 데이터 등록일자 |
| `rgst_uid` | varchar(20) | | 데이터 등록 사용자 사번 |
| `updt_dttm` | timestamp | | 데이터 수정일자 |
| `updt_uid` | varchar(20) | | 데이터 수정 사용자 사번 |

---

## t_region_cd — 지역 카테고리 코드 테이블

자기참조(self-reference) 구조로 카테고리 계층을 표현합니다(`up_cd` → 상위 `cate_cd`).

| 컬럼 | 타입 | 키 | 설명 |
|------|------|----|------|
| `cate_cd` | varchar(10) | PK | 카테고리 코드 번호 |
| `lvl` | int4 | | 카테고리 레벨 |
| `up_cd` | varchar(10) | FK(추정) | 상위 카테고리 코드 번호 (→ `t_region_cd.cate_cd`) |
| `cd_name` | varchar(20) | | 카테고리 코드 이름 |

---

## t_governor — 정압기 정보 테이블

정압기 설비의 마스터 정보. 측정 데이터(`t_governor_stat`)의 부모 테이블입니다.

| 컬럼 | 타입 | 키 | 설명 |
|------|------|----|------|
| `gvrnr_uid` | varchar(40) | PK | 정압기 식별번호 |
| `gvrnr_nm` | varchar(20) | | 정압기 이름 |
| `cate_cd` | varchar(10) | FK(추정) | 지역 코드 번호 (→ `t_region_cd.cate_cd`) |
| `rgst_dttm` | timestamp | | 데이터 등록일자 |
| `rgst_uid` | varchar(20) | | 데이터 등록 사용자 사번 |
| `updt_dttm` | timestamp | | 데이터 수정일자 |
| `updt_uid` | varchar(20) | | 데이터 수정 사용자 사번 |
| `inspct_day` | varchar(3) | | 정압기 점검 요일 |

---

## t_governor_stat — 정압기 측정 트렌드 테이블

정압기에서 수집되는 시계열 측정 데이터. **계속 적재되는 대용량 테이블**이며, `(gvrnr_uid, record_dttm)` 복합 기본키로 보입니다.

| 컬럼 | 타입 | 키 | 설명 |
|------|------|----|------|
| `gvrnr_uid` | varchar(40) | PK / FK(추정) | 정압기 식별번호 (→ `t_governor.gvrnr_uid`) |
| `record_dttm` | timestamp | PK | 측정일자 |
| `gvrnr_press1` | numeric(16, 8) | | 정압기 1차 압력 |
| `gvrnr_press2` | numeric(16, 8) | | 정압기 2차 압력 |
| `gvrnr_trnsps1` | int4 | | 정압기 1차 전위 |
| `gvrnr_trnsps2` | int4 | | 정압기 2차 전위 |
| `rgst_dttm` | timestamp | | 데이터 등록일자 |
| `rgst_uid` | varchar(20) | | 등록한 사용자 사번 |
| `updt_dttm` | timestamp | | 데이터 수정일자 |
| `updt_uid` | varchar(20) | | 수정한 사용자 사번 |

---

## t_file_upload_log — 파일 업로드 이력 테이블

| 컬럼 | 타입 | 키 | 설명 |
|------|------|----|------|
| `mbr_uid` | varchar(20) | FK(추정) | 업로드 회원 사번 (→ `t_mbr.mbr_uid`) |
| `success_yn` | bpchar(1) | | 성공 여부 (Y/N) |
| `file_name` | varchar(100) | | 파일명 |
| `rgst_dttm` | timestamp | | 데이터 등록일자 |
| `rgst_uid` | varchar(20) | | 데이터 등록 사용자 사번 |
| `updt_dttm` | timestamp | | 데이터 수정일자 |
| `updt_uid` | varchar(20) | | 데이터 수정 사용자 사번 |

> 다이어그램상 명시적 기본키가 보이지 않습니다. 이력 테이블이라면 별도 시퀀스/식별자 컬럼(예: `log_uid`) 또는 `(mbr_uid, rgst_dttm)` 조합 키를 두는 것을 검토해 볼 수 있습니다.

---

## view_governor_stat — 정압기 측정값 조회 뷰

`t_governor`와 `t_governor_stat`를 조인해 정압기 이름과 함께 측정값을 노출하는 뷰로 추정됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `gvrnr_uid` | varchar(40) | 정압기 식별번호 |
| `gvrnr_nm` | varchar(20) | 정압기 이름 |
| `record_dttm` | timestamp | 측정일자 |
| `gvrnr_press1` | numeric(16, 8) | 정압기 1차 압력 |
| `gvrnr_press2` | numeric(16, 8) | 정압기 2차 압력 |

---

## 관계 요약 (추정)

```
t_region_cd (cate_cd) ──< t_region_cd (up_cd)        // 자기참조 계층
t_region_cd (cate_cd) ──< t_governor (cate_cd)
t_governor  (gvrnr_uid) ──< t_governor_stat (gvrnr_uid)
t_mbr (mbr_uid) ──< t_file_upload_log (mbr_uid)
t_mbr (mbr_uid) ──< 각 테이블의 rgst_uid / updt_uid    // 감사 컬럼
view_governor_stat = t_governor ⋈ t_governor_stat     // 뷰
```

## 참고 메모

- **대용량 테이블 인덱스**: `t_governor_stat`는 조회가 대부분 "특정 정압기의 특정 기간"이므로 PK인 `(gvrnr_uid, record_dttm)`가 핵심 인덱스 역할을 합니다. 트렌드 조회 패턴에 맞아 적절합니다.
- **파티셔닝 후보**: `record_dttm` 기준 시간 레인지 파티셔닝(월/주 단위)이 적합한 구조입니다.
- **타입 메모**: `bpchar(1)`은 공백 패딩이 있는 고정폭 문자형입니다. Y/N 플래그 용도라면 의도된 것이나, 비교 시 트레일링 공백 처리에 주의하세요.
- **명명 규칙**: 테이블 `t_` 접두사, 뷰 `view_` 접두사, 감사 컬럼 4종(`rgst_*`, `updt_*`) 공통 사용이 일관적입니다.
