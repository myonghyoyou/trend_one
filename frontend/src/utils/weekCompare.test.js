import { test } from "node:test";
import assert from "node:assert/strict";
import { getPreviousPeriod, shiftTimestamp, mergeWeeklyComparison } from "./weekCompare.js";

test("getPreviousPeriod shifts back by the inclusive range length", () => {
  assert.deepEqual(getPreviousPeriod("2026-07-06", "2026-07-12"), {
    startDate: "2026-06-29",
    endDate: "2026-07-05",
    shiftDays: 7,
  });
});

test("getPreviousPeriod handles a single-day range", () => {
  assert.deepEqual(getPreviousPeriod("2026-07-06", "2026-07-06"), {
    startDate: "2026-07-05",
    endDate: "2026-07-05",
    shiftDays: 1,
  });
});

test("shiftTimestamp shifts only the date part", () => {
  assert.equal(shiftTimestamp("2026-06-29 09:10", 7), "2026-07-06 09:10");
});

test("mergeWeeklyComparison matches same-timestamp values and shifts chart coordinates onto this week's axis", () => {
  const thisWeek = {
    xAxisList: ["2026-07-06 09:00", "2026-07-06 09:10"],
    statDataObj: {
      GOV1: {
        gvrnr_nm: "governor-1",
        gvrnr_press2: [2.3, 2.4],
        gvrnr_press2_chart: [
          ["2026-07-06 09:00", 2.3],
          ["2026-07-06 09:10", 2.4],
        ],
      },
    },
  };
  const lastWeek = {
    xAxisList: ["2026-06-29 09:00", "2026-06-29 09:10"],
    statDataObj: {
      GOV1: {
        gvrnr_nm: "governor-1",
        gvrnr_press2: [2.1, null],
        gvrnr_press2_chart: [
          ["2026-06-29 09:00", 2.1],
          ["2026-06-29 09:10", null],
        ],
      },
    },
  };

  const merged = mergeWeeklyComparison(thisWeek, lastWeek, 7);

  assert.equal(merged.GOV1.gvrnr_nm, "governor-1");
  assert.deepEqual(merged.GOV1.gvrnr_press2, [2.3, 2.4]);
  assert.deepEqual(merged.GOV1.lastWeek.gvrnr_press2, [2.1, null]);
  assert.deepEqual(merged.GOV1.lastWeek.gvrnr_press2_chart, [
    { value: ["2026-07-06 09:00", 2.1], originalTimestamp: "2026-06-29 09:00" },
    { value: ["2026-07-06 09:10", null], originalTimestamp: "2026-06-29 09:10" },
  ]);
});

test("mergeWeeklyComparison fills nulls when a governor has no last-week data", () => {
  const thisWeek = {
    xAxisList: ["2026-07-06 09:00"],
    statDataObj: {
      GOV1: {
        gvrnr_nm: "governor-1",
        gvrnr_press2: [2.3],
        gvrnr_press2_chart: [["2026-07-06 09:00", 2.3]],
      },
    },
  };
  const lastWeek = { xAxisList: [], statDataObj: {} };

  const merged = mergeWeeklyComparison(thisWeek, lastWeek, 7);

  assert.deepEqual(merged.GOV1.lastWeek.gvrnr_press2, [null]);
  assert.deepEqual(merged.GOV1.lastWeek.gvrnr_press2_chart, [
    { value: ["2026-07-06 09:00", null], originalTimestamp: null },
  ]);
});

test("mergeWeeklyComparison matches by actual timestamp, not array position, when a week has a data gap", () => {
  // xAxisList는 고정 격자가 아니라 실제 DB에 존재하는 행의 타임스탬프 합집합이므로
  // (GovernorStatServiceImpl.search 참고), 두 주의 길이가 다를 수 있다.
  // 이번주는 09:00/09:10/09:20 세 시각, 지난주는 09:10이 결측되어 09:00/09:20 두 시각만 있는 경우:
  const thisWeek = {
    xAxisList: ["2026-07-06 09:00", "2026-07-06 09:10", "2026-07-06 09:20"],
    statDataObj: {
      GOV1: {
        gvrnr_nm: "governor-1",
        gvrnr_press2: [2.3, 2.4, 2.5],
        gvrnr_press2_chart: [
          ["2026-07-06 09:00", 2.3],
          ["2026-07-06 09:10", 2.4],
          ["2026-07-06 09:20", 2.5],
        ],
      },
    },
  };
  const lastWeek = {
    xAxisList: ["2026-06-29 09:00", "2026-06-29 09:20"],
    statDataObj: {
      GOV1: {
        gvrnr_nm: "governor-1",
        gvrnr_press2: [2.1, 2.2],
        gvrnr_press2_chart: [
          ["2026-06-29 09:00", 2.1],
          ["2026-06-29 09:20", 2.2],
        ],
      },
    },
  };

  const merged = mergeWeeklyComparison(thisWeek, lastWeek, 7);

  // 09:00 -> 09:00(-7d)=2.1, 09:10 -> 지난주에 실제로 없으므로 null, 09:20 -> 09:20(-7d)=2.2
  // (배열 인덱스로 정렬하면 [2.1, 2.2, null]이 되어 09:10 자리에 09:20 값이 잘못 들어간다)
  assert.deepEqual(merged.GOV1.lastWeek.gvrnr_press2, [2.1, null, 2.2]);
});
