/**
 * 도메인 상수. docs/plan.md 섹션 2 "반드시 동일하게 유지해야 하는 항목" 참고.
 * t_region_cd.cate_cd FK 값, t_governor.inspct_day 저장값과 1:1로 맞춰야 한다.
 */

export const REGION_OPTIONS = [
  { value: "3100", label: "경기" },
  { value: "1100", label: "서울" },
];

export const INSPECTION_DAY_OPTIONS = [
  { value: "MON", label: "월요일" },
  { value: "TUE", label: "화요일" },
  { value: "WED", label: "수요일" },
  { value: "THU", label: "목요일" },
  { value: "FRI", label: "금요일" },
];

export const INTERVAL_OPTIONS = [
  { value: "1", label: "1분" },
  { value: "20", label: "20분" },
  { value: "30", label: "30분" },
  { value: "40", label: "40분" },
];

export const MAX_SELECTED_GOVERNORS = 3;

export const MAX_SEARCH_DATE_RANGE_DAYS = 30;

export const RES_CD = {
  SUCCESS: "0000",
  FAIL: "0001",
  SESSION_EXPIRED: "0002",
};
