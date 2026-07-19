/** @param {Date} date */
function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

export function today() {
  return toDateInputValue(new Date());
}

/** @param {number} n */
export function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return toDateInputValue(date);
}

/**
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number} endDate - startDate (일 단위, 음수 가능)
 */
export function dateDiffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
