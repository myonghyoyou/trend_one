export const PRINT_INTERVAL = "20";

function parseLocalDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function getDayOfWeek(dateString) {
  return parseLocalDate(dateString).getDay();
}

export function buildWeekdayReportPeriod(startDate) {
  return {
    startDate,
    endDate: addDays(startDate, 4),
  };
}

export function validateWeekdayReportPeriod(startDate, endDate) {
  if (getDayOfWeek(startDate) !== 1) {
    return { valid: false, message: "주간 보고서 시작일은 월요일이어야 합니다." };
  }

  if (getDayOfWeek(endDate) !== 5) {
    return { valid: false, message: "주간 보고서 종료일은 금요일이어야 합니다." };
  }

  if (endDate !== addDays(startDate, 4)) {
    return { valid: false, message: "주간 보고서 기간은 월요일부터 금요일까지여야 합니다." };
  }

  return { valid: true, message: "" };
}

export function getLatestCompletedWeekPeriod(todayDate) {
  const day = getDayOfWeek(todayDate);
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const currentMonday = addDays(todayDate, -daysFromMonday);
  const startDate = day >= 1 && day <= 5 ? addDays(currentMonday, -7) : currentMonday;
  return buildWeekdayReportPeriod(startDate);
}
