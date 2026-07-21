import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import PropTypes from "prop-types";

const SERIES_COLORS = ["#2563eb", "#f59e0b", "#10b981"];
const LAST_WEEK_OPACITY = 0.45;

function formatPressureValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "-";
}

function formatDelta(thisValue, lastValue) {
  if (typeof thisValue !== "number" || typeof lastValue !== "number") return null;
  const diff = thisValue - lastValue;
  return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
}

function buildComparisonTooltip(params) {
  const axisLabel = params[0]?.axisValueLabel ?? "";
  const byGovernor = new Map();

  for (const p of params) {
    const isLastWeek = p.seriesId.endsWith("__lastWeek");
    const gvrnrUid = isLastWeek ? p.seriesId.slice(0, -"__lastWeek".length) : p.seriesId;
    const baseName = p.seriesName.replace(/ \((이번주|지난주)\)$/, "");
    const entry = byGovernor.get(gvrnrUid) ?? { name: baseName, color: p.color };

    if (isLastWeek) {
      entry.lastWeekValue = p.data?.value?.[1] ?? null;
      entry.lastWeekActualTs = p.data?.originalTimestamp ?? null;
    } else {
      entry.thisWeekValue = Array.isArray(p.data) ? p.data[1] : null;
    }
    byGovernor.set(gvrnrUid, entry);
  }

  const lines = [axisLabel];
  for (const entry of byGovernor.values()) {
    const delta = formatDelta(entry.thisWeekValue, entry.lastWeekValue);
    const lastDateLabel = entry.lastWeekActualTs ? ` · ${entry.lastWeekActualTs}` : "";
    lines.push(
      `<span style="color:${entry.color}">●</span> ${entry.name}: ` +
        `${formatPressureValue(entry.thisWeekValue)} (이번주) / ` +
        `${formatPressureValue(entry.lastWeekValue)}${lastDateLabel} (지난주)` +
        (delta ? ` · Δ ${delta}` : "")
    );
  }
  return lines.join("<br/>");
}

/**
 * @param {{
 *   statDataObj: Record<string, {
 *     gvrnr_nm: string,
 *     gvrnr_press2_chart: Array<[string, number|null]>,
 *     lastWeek?: { gvrnr_press2_chart: Array<{ value: [string, number|null], originalTimestamp: string|null }> },
 *   }> | null,
 * }} props
 */
export default function StatsChart({ statDataObj }) {
  const option = useMemo(() => {
    const entries = Object.entries(statDataObj ?? {});
    const compareMode = entries.some(([, gov]) => gov.lastWeek);

    const legendData = entries.flatMap(([, gov]) =>
      gov.lastWeek ? [`${gov.gvrnr_nm} (이번주)`, `${gov.gvrnr_nm} (지난주)`] : [gov.gvrnr_nm]
    );

    const series = entries.flatMap(([gvrnrUid, gov], index) => {
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      const thisWeekSeries = {
        id: gvrnrUid,
        name: gov.lastWeek ? `${gov.gvrnr_nm} (이번주)` : gov.gvrnr_nm,
        type: "line",
        showSymbol: false,
        color,
        data: gov.gvrnr_press2_chart,
      };
      if (!gov.lastWeek) return [thisWeekSeries];

      const lastWeekSeries = {
        id: `${gvrnrUid}__lastWeek`,
        name: `${gov.gvrnr_nm} (지난주)`,
        type: "line",
        showSymbol: false,
        color,
        lineStyle: { type: "dashed", opacity: LAST_WEEK_OPACITY },
        data: gov.lastWeek.gvrnr_press2_chart,
      };
      return [thisWeekSeries, lastWeekSeries];
    });

    return {
      grid: { left: 48, right: 24, top: 32, bottom: 64 },
      tooltip: compareMode
        ? { trigger: "axis", formatter: buildComparisonTooltip }
        : {
            trigger: "axis",
            valueFormatter: (value) =>
              value === null || value === undefined || value === "" ? "-" : formatPressureValue(value),
          },
      legend: { top: 0, data: legendData },
      xAxis: { type: "time" },
      yAxis: {
        type: "value",
        min: (extent) => Math.min(1.7, extent.min),
        max: (extent) => Math.max(3.0, extent.max),
      },
      dataZoom: [{ type: "inside" }, { type: "slider" }],
      series,
    };
  }, [statDataObj]);

  const hasData = Object.keys(statDataObj ?? {}).length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">2차 압력 트렌드</h2>
      {hasData ? (
        <ReactECharts option={option} style={{ height: 360 }} notMerge />
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">
          정압기를 선택하고 조회하면 차트가 표시됩니다.
        </p>
      )}
    </div>
  );
}

StatsChart.propTypes = {
  statDataObj: PropTypes.object,
};
