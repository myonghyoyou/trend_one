const REGION_LABELS = {
  "1100": "서울",
  "3100": "경기",
};

const INSPECTION_DAY_LABELS = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
};

const INSPECTION_DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI"];
export const PRINT_CHARTS_PER_PAGE = 4;
export const PRINT_CONTINUATION_CHARTS_PER_PAGE = 5;

export function splitIntoChunks(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

/**
 * 요일별 인쇄 페이지를 만든다.
 * 각 요일은 보고서 제목이 있는 첫 페이지에 4개를 배치하고,
 * 남은 정압기는 같은 요일의 이어지는 페이지에 5개씩 배치한다.
 * 정압기가 없는 요일도 요일별 보고서 구조를 유지하기 위해 빈 첫 페이지를 만든다.
 * @param {Array<{code: string, label: string, governors: Array<object>}>} weekdaySections
 */
export function buildWeekdayPrintPages(weekdaySections = []) {
  return weekdaySections.flatMap((section) => {
    const firstPageGovernors = section.governors.slice(0, PRINT_CHARTS_PER_PAGE);
    const continuationChunks = splitIntoChunks(
      section.governors.slice(PRINT_CHARTS_PER_PAGE),
      PRINT_CONTINUATION_CHARTS_PER_PAGE
    );

    return [
      {
        ...section,
        governors: firstPageGovernors,
        isFirstPage: true,
      },
      ...continuationChunks.map((governors) => ({
        ...section,
        governors,
        isFirstPage: false,
      })),
    ];
  });
}

function resolveLabel(value, labels) {
  if (value === null || value === undefined || value === "") return "";
  return labels[value] ?? value;
}

function resolveInspectionDayCode(value) {
  if (INSPECTION_DAY_ORDER.includes(value)) return value;
  return Object.entries(INSPECTION_DAY_LABELS).find(([, label]) => label === value)?.[0] ?? "";
}

/** @param {unknown} value */
export function formatReportValue(value) {
  if (value === null || value === undefined || value === "") return "-";

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "-";
}

/** @param {Array<unknown>|null|undefined} values */
export function summarizeValues(values) {
  const numeric = (values ?? []).filter(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
  if (numeric.length === 0) return { min: null, avg: null, max: null };

  const sum = numeric.reduce((total, value) => total + value, 0);
  return {
    min: Math.min(...numeric),
    avg: sum / numeric.length,
    max: Math.max(...numeric),
  };
}

/**
 * 현재 주차 배열과 지난주 비교 배열을 공통 차트 데이터로 바꾼다.
 * @param {Array<[string, number|null]>|Array<{value: [string, number|null]}>|null|undefined} points
 * @returns {Array<{timestamp: string, value: number}>}
 */
export function normalizeChartSeries(points) {
  return (points ?? [])
    .map((point) => {
      if (Array.isArray(point)) {
        return { timestamp: point[0], value: point[1] };
      }

      const value = point?.value;
      return {
        timestamp: Array.isArray(value) ? value[0] : point?.timestamp,
        value: Array.isArray(value) ? value[1] : point?.value,
      };
    })
    .filter(
      (point) =>
        point.timestamp !== undefined &&
        point.timestamp !== null &&
        point.value !== null &&
        point.value !== undefined &&
        point.value !== "" &&
        Number.isFinite(Number(point.value))
    )
    .map((point) => ({ ...point, value: Number(point.value) }));
}

/**
 * 정압기 하나의 차트에 맞는 Y축 범위를 계산한다.
 * 값의 변동이 작아도 최소 범위와 여백을 확보해 선이 보이도록 한다.
 * @param {Array<{value: number}>} series
 * @returns {{min: number, max: number}}
 */
export function calculateSeriesRange(series) {
  const values = (series ?? [])
    .map((point) => Number(point?.value))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return { min: 0, max: 1 };

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax), 1) * 0.1, 0.1);
  const padding = span * 0.15;
  const center = (rawMin + rawMax) / 2;

  return {
    min: Math.max(0, center - span / 2 - padding),
    max: center + span / 2 + padding,
  };
}

/**
 * 인쇄용 측정 행을 만든다. 각 정압기의 배열은 xAxisList와 같은 인덱스를 사용한다.
 * @param {string[]} xAxisList
 * @param {Record<string, object>|null|undefined} statDataObj
 * @param {boolean} compareMode
 */
export function buildMeasurementRows(xAxisList, statDataObj, compareMode = false) {
  const governors = Object.entries(statDataObj ?? {});

  return (xAxisList ?? []).map((timestamp, index) => ({
    timestamp,
    values: governors.map(([uid, governor]) => ({
      uid,
      current: formatReportValue(governor?.gvrnr_press2?.[index]),
      previous:
        compareMode && governor?.lastWeek
          ? formatReportValue(governor.lastWeek.gvrnr_press2?.[index])
          : null,
    })),
  }));
}

function buildGovernorModel(governor, stat, compareMode) {
  const currentValues = stat?.gvrnr_press2 ?? [];
  const previousValues = stat?.lastWeek?.gvrnr_press2 ?? [];
  const currentSummary = summarizeValues(currentValues);
  const previousSummary = compareMode && stat?.lastWeek ? summarizeValues(previousValues) : null;

  return {
    uid: governor.gvrnr_uid,
    name: governor.gvrnr_nm ?? stat?.gvrnr_nm ?? "",
    region: governor.cd_name ?? "",
    inspectionDay: resolveLabel(governor.inspct_day, INSPECTION_DAY_LABELS),
    measurementCount:
      governor.gvrnr_stat_cnt ?? currentValues.filter((value) => typeof value === "number" && Number.isFinite(value)).length,
    currentSummary,
    previousSummary,
    avgDelta:
      typeof previousSummary?.avg === "number" && typeof currentSummary.avg === "number"
        ? currentSummary.avg - previousSummary.avg
        : null,
    currentChart: normalizeChartSeries(stat?.gvrnr_press2_chart),
    previousChart: compareMode ? normalizeChartSeries(stat?.lastWeek?.gvrnr_press2_chart) : [],
  };
}

export function buildPrintReportModel({
  searchParams = {},
  selectedGovernors = [],
  statsData = {},
  compareMode = false,
  intervalNum = "",
  generatedAt = "",
  includeMeasurementRows = true,
}) {
  const statDataObj = statsData?.statDataObj ?? {};
  const governors = selectedGovernors.map((governor) =>
    buildGovernorModel(governor, statDataObj[governor.gvrnr_uid], compareMode)
  );
  const weekdaySections = INSPECTION_DAY_ORDER.map((code) => ({
    code,
    label: INSPECTION_DAY_LABELS[code],
    governors: governors.filter((governor) => resolveInspectionDayCode(governor.inspectionDay) === code),
  }));

  return {
    metadata: {
      title: "지역정압기 압력 기록 보고서",
      startDate: searchParams.startDate ?? "",
      endDate: searchParams.endDate ?? "",
      region: resolveLabel(searchParams.srchCity, REGION_LABELS),
      inspectionDay: resolveLabel(searchParams.inspctDay, INSPECTION_DAY_LABELS),
      governorKeyword: searchParams.srchCntnt ?? "",
      intervalNum: searchParams.intervalNum ?? intervalNum ?? "",
      targetCount: governors.length,
      generatedAt,
    },
    compareMode,
    governors,
    weekdaySections,
    measurementRows: includeMeasurementRows
      ? buildMeasurementRows(statsData?.xAxisList ?? [], statDataObj, compareMode)
      : [],
  };
}
