import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRINT_INTERVAL,
  buildWeekdayReportPeriod,
  getLatestCompletedWeekPeriod,
  validateWeekdayReportPeriod,
} from "./weeklyReportPeriod.js";

test("builds a Monday-to-Friday report period", () => {
  assert.deepEqual(buildWeekdayReportPeriod("2026-07-06"), {
    startDate: "2026-07-06",
    endDate: "2026-07-10",
  });
});

test("rejects a non-Monday start date", () => {
  assert.deepEqual(validateWeekdayReportPeriod("2026-07-07", "2026-07-11"), {
    valid: false,
    message: "주간 보고서 시작일은 월요일이어야 합니다.",
  });
});

test("rejects a non-Friday end date", () => {
  assert.deepEqual(validateWeekdayReportPeriod("2026-07-06", "2026-07-12"), {
    valid: false,
    message: "주간 보고서 종료일은 금요일이어야 합니다.",
  });
});

test("rejects a period longer than Monday to Friday", () => {
  assert.deepEqual(validateWeekdayReportPeriod("2026-07-06", "2026-07-17"), {
    valid: false,
    message: "주간 보고서 기간은 월요일부터 금요일까지여야 합니다.",
  });
});

test("returns the latest completed week on a weekday", () => {
  assert.deepEqual(getLatestCompletedWeekPeriod("2026-07-22"), {
    startDate: "2026-07-13",
    endDate: "2026-07-17",
  });
});

test("uses the current week after it has ended", () => {
  assert.deepEqual(getLatestCompletedWeekPeriod("2026-07-25"), {
    startDate: "2026-07-20",
    endDate: "2026-07-24",
  });
});

test("keeps the print interval fixed at twenty minutes", () => {
  assert.equal(PRINT_INTERVAL, "20");
});
