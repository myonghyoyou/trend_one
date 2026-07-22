import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMeasurementRows,
  buildPrintReportModel,
  calculateSeriesRange,
  formatReportValue,
  normalizeChartSeries,
  buildWeekdayPrintPages,
  PRINT_CHARTS_PER_PAGE,
  PRINT_CONTINUATION_CHARTS_PER_PAGE,
  splitIntoChunks,
  summarizeValues,
} from "./reportModel.js";

test("formats finite pressure values to two decimal places", () => {
  assert.equal(formatReportValue(2.2365), "2.24");
  assert.equal(formatReportValue(null), "-");
});

test("summarizes numeric values and ignores empty values", () => {
  assert.deepEqual(summarizeValues([1, null, 3, ""]), {
    min: 1,
    avg: 2,
    max: 3,
  });
});

test("normalizes chart points and ignores null or non-finite values", () => {
  assert.deepEqual(
    normalizeChartSeries([
      ["2026-07-06 00:00:00", 0.45],
      ["2026-07-06 00:01:00", null],
      { value: ["2026-07-06 00:02:00", 0.46] },
    ]),
    [
      { timestamp: "2026-07-06 00:00:00", value: 0.45 },
      { timestamp: "2026-07-06 00:02:00", value: 0.46 },
    ]
  );
  assert.deepEqual(normalizeChartSeries([]), []);
});

test("keeps a visible range for small pressure variations", () => {
  const range = calculateSeriesRange([
    { value: 0.45 },
    { value: 0.46 },
  ]);

  assert.ok(range.min < 0.45);
  assert.ok(range.max > 0.46);
  assert.ok(range.max - range.min >= 0.1);
});

test("builds measurement rows with current and previous week columns", () => {
  const rows = buildMeasurementRows(
    ["2026-07-06 00:00:00"],
    {
      gov1: {
        gvrnr_nm: "서울.테스트.P2",
        gvrnr_press2: [2.2365],
        lastWeek: { gvrnr_press2: [2.1] },
      },
    },
    true
  );

  assert.deepEqual(rows[0], {
    timestamp: "2026-07-06 00:00:00",
    values: [{ uid: "gov1", current: "2.24", previous: "2.10" }],
  });
});

test("builds report metadata, governor summaries, and chart values", () => {
  const model = buildPrintReportModel({
    searchParams: {
      startDate: "2026-07-06",
      endDate: "2026-07-12",
      srchCity: "서울특별시",
      inspctDay: "월요일",
      srchCntnt: "테스트",
    },
    selectedGovernors: [
      {
        gvrnr_uid: "gov1",
        gvrnr_nm: "서울.테스트.P2",
        cd_name: "서울특별시",
        inspct_day: "월요일",
        gvrnr_stat_cnt: 1,
      },
    ],
    statsData: {
      xAxisList: ["2026-07-06 00:00:00"],
      statDataObj: {
        gov1: {
          gvrnr_nm: "서울.테스트.P2",
          gvrnr_press2: [2.2365],
          gvrnr_press2_chart: [["2026-07-06 00:00:00", 2.2365]],
          lastWeek: {
            gvrnr_press2: [2.1],
            gvrnr_press2_chart: [
              {
                value: ["2026-07-06 00:00:00", 2.1],
                originalTimestamp: "2026-06-29 00:00:00",
              },
            ],
          },
        },
      },
    },
    compareMode: true,
    generatedAt: "2026-07-22 10:00:00",
  });

  assert.deepEqual(model.metadata, {
    title: "지역정압기 압력 기록 보고서",
    startDate: "2026-07-06",
    endDate: "2026-07-12",
    region: "서울특별시",
    inspectionDay: "월요일",
    governorKeyword: "테스트",
    intervalNum: "",
    targetCount: 1,
    generatedAt: "2026-07-22 10:00:00",
  });
  assert.equal(model.compareMode, true);
  const { avgDelta, ...governorWithoutDelta } = model.governors[0];
  assert.deepEqual(governorWithoutDelta, {
    uid: "gov1",
    name: "서울.테스트.P2",
    region: "서울특별시",
    inspectionDay: "월요일",
    measurementCount: 1,
    currentSummary: { min: 2.2365, avg: 2.2365, max: 2.2365 },
    previousSummary: { min: 2.1, avg: 2.1, max: 2.1 },
    currentChart: [{ timestamp: "2026-07-06 00:00:00", value: 2.2365 }],
    previousChart: [{ timestamp: "2026-07-06 00:00:00", value: 2.1 }],
  });
  assert.ok(Math.abs(avgDelta - 0.1365) < Number.EPSILON);
  assert.deepEqual(model.measurementRows, [
    {
      timestamp: "2026-07-06 00:00:00",
      values: [{ uid: "gov1", current: "2.24", previous: "2.10" }],
    },
  ]);
});

test("does not build measurement rows for chart-only print reports", () => {
  const model = buildPrintReportModel({
    selectedGovernors: [{ gvrnr_uid: "gov1", gvrnr_nm: "서울.테스트.P2" }],
    statsData: {
      xAxisList: ["2026-07-06 00:00:00"],
      statDataObj: {
        gov1: {
          gvrnr_nm: "서울.테스트.P2",
          gvrnr_press2: [2.2],
          gvrnr_press2_chart: [["2026-07-06 00:00:00", 2.2]],
        },
      },
    },
    includeMeasurementRows: false,
  });

  assert.deepEqual(model.measurementRows, []);
});

test("includes the full report target count in metadata", () => {
  const model = buildPrintReportModel({
    selectedGovernors: [
      { gvrnr_uid: "gov1", gvrnr_nm: "정압기1" },
      { gvrnr_uid: "gov2", gvrnr_nm: "정압기2" },
    ],
    statsData: { statDataObj: {} },
    includeMeasurementRows: false,
  });

  assert.equal(model.metadata.targetCount, 2);
});

test("builds all weekday sections in MON to FRI order, including empty days", () => {
  const model = buildPrintReportModel({
    selectedGovernors: [
      { gvrnr_uid: "gov-mon", gvrnr_nm: "월요일 정압기", inspct_day: "MON" },
      { gvrnr_uid: "gov-wed", gvrnr_nm: "수요일 정압기", inspct_day: "WED" },
    ],
    statsData: {
      statDataObj: {
        "gov-mon": { gvrnr_press2: [], gvrnr_press2_chart: [] },
        "gov-wed": { gvrnr_press2: [], gvrnr_press2_chart: [] },
      },
    },
    includeMeasurementRows: false,
  });

  assert.deepEqual(
    model.weekdaySections.map((section) => ({
      code: section.code,
      label: section.label,
      governorUids: section.governors.map((governor) => governor.uid),
    })),
    [
      { code: "MON", label: "월요일", governorUids: ["gov-mon"] },
      { code: "TUE", label: "화요일", governorUids: [] },
      { code: "WED", label: "수요일", governorUids: ["gov-wed"] },
      { code: "THU", label: "목요일", governorUids: [] },
      { code: "FRI", label: "금요일", governorUids: [] },
    ]
  );
});

test("splits weekday governors into print pages of four charts", () => {
  assert.equal(PRINT_CHARTS_PER_PAGE, 4);
  assert.equal(PRINT_CONTINUATION_CHARTS_PER_PAGE, 5);
  assert.deepEqual(splitIntoChunks([1, 2, 3, 4, 5, 6, 7, 8, 9], 4), [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9],
  ]);
});

test("builds a four-chart weekday report page followed by five-chart continuation pages", () => {
  const pages = buildWeekdayPrintPages([
    {
      code: "MON",
      label: "월요일",
      governors: Array.from({ length: 10 }, (_, index) => ({ uid: `mon-${index}` })),
    },
    { code: "TUE", label: "화요일", governors: [] },
  ]);

  assert.deepEqual(
    pages.map((page) => ({
      code: page.code,
      isFirstPage: page.isFirstPage,
      governorCount: page.governors.length,
    })),
    [
      { code: "MON", isFirstPage: true, governorCount: 4 },
      { code: "MON", isFirstPage: false, governorCount: 5 },
      { code: "MON", isFirstPage: false, governorCount: 1 },
      { code: "TUE", isFirstPage: true, governorCount: 0 },
    ]
  );
});
