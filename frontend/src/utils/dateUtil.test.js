import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./dateUtil.js";

test("addDays adds positive days across a month boundary", () => {
  assert.equal(addDays("2026-06-29", 7), "2026-07-06");
});

test("addDays subtracts days across a month boundary", () => {
  assert.equal(addDays("2026-07-06", -7), "2026-06-29");
});

test("addDays with zero returns the same date", () => {
  assert.equal(addDays("2026-07-06", 0), "2026-07-06");
});
