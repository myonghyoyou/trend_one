import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import PropTypes from "prop-types";

const SERIES_COLORS = ["#2563eb", "#f59e0b", "#10b981"];

/**
 * @param {{
 *   statDataObj: Record<string, {
 *     gvrnr_nm: string,
 *     gvrnr_press2_chart: Array<[number, number]>,
 *   }> | null,
 * }} props
 */
export default function StatsChart({ statDataObj }) {
  const option = useMemo(() => {
    const entries = Object.entries(statDataObj ?? {});

    return {
      color: SERIES_COLORS,
      grid: { left: 48, right: 24, top: 32, bottom: 64 },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => {
          if (value === null || value === undefined || value === "") {
            return "-";
          }
          const numericValue = Number(value);
          return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "-";
        },
      },
      legend: { top: 0, data: entries.map(([, gov]) => gov.gvrnr_nm) },
      xAxis: { type: "time" },
      yAxis: {
        type: "value",
        min: (extent) => Math.min(1.7, extent.min),
        max: (extent) => Math.max(3.0, extent.max),
      },
      dataZoom: [{ type: "inside" }, { type: "slider" }],
      series: entries.map(([gvrnrUid, gov]) => ({
        id: gvrnrUid,
        name: gov.gvrnr_nm,
        type: "line",
        showSymbol: false,
        data: gov.gvrnr_press2_chart,
      })),
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
