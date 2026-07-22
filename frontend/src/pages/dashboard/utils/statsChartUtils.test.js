import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePressureAxisRange } from "./statsChartUtils.js";

test("keeps negative pressure values inside the calculated axis range", () => {
  const range = calculatePressureAxisRange({
    gov1: {
      gvrnr_press2_chart: [
        ["2026-07-06 00:00", -0.12],
        ["2026-07-06 00:01", -0.1],
      ],
    },
  });

  assert.ok(range.min <= -0.12);
  assert.ok(range.max >= -0.1);
});

test("returns a safe default when chart values are empty or invalid", () => {
  assert.deepEqual(
    calculatePressureAxisRange({
      gov1: { gvrnr_press2_chart: [["2026-07-06 00:00", null]] },
    }),
    { min: 0, max: 1 }
  );
});
