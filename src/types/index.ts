// 공통 API 응답 envelope
export interface ApiResponse<T = undefined> {
  resCd: '0000' | '0001' | '0002';
  resMsg?: string;
  data?: T;
}

// iron-session 세션 데이터 shape
// 빈 세션(쿠키 없음)에서 모든 필드가 undefined로 반환되므로 optional로 선언
export interface SessionData {
  isLoggedIn?: boolean;
  userId?: string;
  loginAt?: string;
}

// t_governor + t_region_cd 조인 결과 (정압기 목록)
export interface Governor {
  gvrnr_uid: string;
  gvrnr_nm: string;
  inspct_day: string;
  cate_cd: string;
  cd_name: string;
  gvrnr_stat_cnt: number;
}

// t_governor_stat 단일 행 (raw)
export interface GovernorStatRow {
  gvrnr_uid: string;
  record_dttm: string;
  gvrnr_press1: string; // pg는 numeric(16,8)을 string으로 반환
  gvrnr_press2: string;
  gvrnr_trnsps1: number;
  gvrnr_trnsps2: number;
}

// 정압기별 집계 통계 (차트/테이블 표시용)
export interface GovernorStatData {
  press1: (number | null)[];
  press2: (number | null)[];
  trnsps1: (number | null)[];
  trnsps2: (number | null)[];
}

// /api/governors/stats 응답
export interface StatsResponse {
  resCd: '0000' | '0001' | '0002';
  resMsg?: string;
  xAxisList?: string[];
  statDataObj?: Record<string, GovernorStatData>;
}

// gvrnr_mng_sys_app_transaction 테이블 행
export interface TransactionRecord {
  id: number;
  transaction_id: string;
  status: TransactionStatus;
  data: TransactionData;
  created_at: string;
  updated_at: string;
}

export type TransactionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rolled_back'
  | 'failed';

// Transaction.data JSONField 내용
export interface TransactionData {
  new_gvrnr_uids: string[];
  updated_gvrnr_uids: string[];
}

// t_file_upload_log INSERT 입력
export interface FileUploadLogInput {
  mbr_uid: string;
  success_yn: 'Y' | 'N';
  file_name: string;
  rgst_uid: string;
}

// Phase 5 — 정압기 검색

// SearchForm 제출값 (클라이언트 폼 데이터)
export interface GovernorSearchFormValues {
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  srchCity: '3100' | '1100';
  inspctDay: string;       // '' = 전체, 'MON'|'TUE'|'WED'|'THU'|'FRI'
  srchCntnt: string;       // '' = 필터 없음
}

// /api/governors/list 요청 body
export interface GovernorListRequest {
  startDate: string;
  endDate: string;
  srchCity: '3100' | '1100';
  inspctDay?: string;
  srchCntnt?: string;
}

// /api/governors/list 응답
export interface GovernorListResponse {
  resCd: '0000' | '0001' | '0002';
  resMsg?: string;
  gvrnrList?: Governor[];
}
