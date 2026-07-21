import { addDays, dateDiffDays } from "./dateUtil.js";

/**
 * 검색 기간과 동일한 길이만큼 바로 앞으로 이동한 "지난주" 기간을 계산한다.
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {{ startDate: string, endDate: string, shiftDays: number }}
 */
export function getPreviousPeriod(startDate, endDate) {
  const rangeDays = dateDiffDays(startDate, endDate) + 1;
  return {
    startDate: addDays(startDate, -rangeDays),
    endDate: addDays(startDate, -1),
    shiftDays: rangeDays,
  };
}

/**
 * @param {string} timestamp - "YYYY-MM-DD HH:MM"
 * @param {number} days
 * @returns {string} 날짜 부분만 이동한 "YYYY-MM-DD HH:MM"
 */
export function shiftTimestamp(timestamp, days) {
  const [datePart, timePart] = timestamp.split(" ");
  return `${addDays(datePart, days)} ${timePart}`;
}

/**
 * 이번주/지난주 GovernorStatsResponse를 병합해 정압기별로 lastWeek 필드를 추가한다.
 *
 * xAxisList는 고정된 시간 격자가 아니라 실제 t_governor_stat에 존재하는 행의 타임스탬프
 * 합집합이다(GovernorStatServiceImpl.search 참고). 즉 이번주/지난주 xAxisList 길이가
 * 다를 수 있으므로 배열 인덱스로 정렬하면 결측치(gap) 하나만 있어도 이후 모든 값이
 * 한 칸씩 밀려 잘못 매칭된다. 따라서 이번주 각 타임스탬프에서 shiftDays를 빼 "그 시각의
 * 지난주 실제 타임스탬프"를 역산한 뒤, 지난주 응답에 그 시각이 실제로 존재하는 경우에만
 * 값을 매칭한다. 없으면 null(결측)로 채운다.
 *
 * @param {{ xAxisList: string[], statDataObj: Record<string, object> }} thisWeek
 * @param {{ xAxisList: string[], statDataObj: Record<string, object> }} lastWeek
 * @param {number} shiftDays
 * @returns {Record<string, object>}
 */
export function mergeWeeklyComparison(thisWeek, lastWeek, shiftDays) {
  const merged = {};

  for (const [gvrnrUid, thisItem] of Object.entries(thisWeek.statDataObj)) {
    const lastItem = lastWeek.statDataObj[gvrnrUid];
    const lastValueByTimestamp = new Map(
      lastWeek.xAxisList.map((ts, i) => [ts, lastItem?.gvrnr_press2?.[i] ?? null])
    );

    const lastPress2 = [];
    const lastChart = [];

    for (const thisTs of thisWeek.xAxisList) {
      const originalTimestamp = shiftTimestamp(thisTs, -shiftDays);
      const hasMatch = lastValueByTimestamp.has(originalTimestamp);
      const value = hasMatch ? lastValueByTimestamp.get(originalTimestamp) : null;

      lastPress2.push(value);
      lastChart.push({ value: [thisTs, value], originalTimestamp: hasMatch ? originalTimestamp : null });
    }

    merged[gvrnrUid] = {
      ...thisItem,
      lastWeek: { gvrnr_press2: lastPress2, gvrnr_press2_chart: lastChart },
    };
  }

  return merged;
}
