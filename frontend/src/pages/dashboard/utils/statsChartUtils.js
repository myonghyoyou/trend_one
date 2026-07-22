function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getChartValue(point) {
  if (Array.isArray(point)) return point[1];
  return Array.isArray(point?.value) ? point.value[1] : null;
}

function collectPressureValues(statDataObj) {
  return Object.values(statDataObj ?? {}).flatMap((governor) => {
    const currentValues = (governor.gvrnr_press2_chart ?? []).map((point) =>
      toFiniteNumber(getChartValue(point))
    );
    const previousValues = (governor.lastWeek?.gvrnr_press2_chart ?? []).map((point) =>
      toFiniteNumber(getChartValue(point))
    );

    return [...currentValues, ...previousValues].filter((value) => value !== null);
  });
}

export function calculatePressureAxisRange(statDataObj) {
  const values = collectPressureValues(statDataObj);
  if (values.length === 0) return { min: 0, max: 1 };

  const dataMin = values.reduce((min, value) => Math.min(min, value), values[0]);
  const dataMax = values.reduce((max, value) => Math.max(max, value), values[0]);
  const dataRange = dataMax - dataMin;
  const padding = Math.max(dataRange * 0.1, 0.05);

  let min = dataMin - padding;
  let max = dataMax + padding;

  if (max - min < 0.1) {
    const center = (min + max) / 2;
    min = center - 0.05;
    max = center + 0.05;
  }

  return { min, max };
}
