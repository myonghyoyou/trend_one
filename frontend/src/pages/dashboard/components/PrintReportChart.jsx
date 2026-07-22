import PropTypes from "prop-types";
import { calculateSeriesRange } from "@/pages/dashboard/utils/reportModel.js";

const VIEWBOX_WIDTH = 900;
const VIEWBOX_HEIGHT = 280;
const PADDING = { top: 42, right: 24, bottom: 42, left: 58 };
const CURRENT_COLOR = "#2563eb";
const PREVIOUS_COLOR = "#64748b";

function buildPath(series, range) {
  if (series.length === 0) return "";

  const chartWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
  const denominator = Math.max(series.length - 1, 1);

  return series
    .map((point, index) => {
      const x = PADDING.left + (chartWidth * index) / denominator;
      const y = PADDING.top + ((range.max - point.value) / (range.max - range.min)) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatAxisValue(value) {
  return Number(value).toFixed(2);
}

function axisTicks(range) {
  return Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      value: range.max - (range.max - range.min) * ratio,
      y: PADDING.top + (VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom) * ratio,
    };
  });
}

function ChartLegend({ governor, hasPrevious }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-5 bg-blue-600" aria-hidden="true" />
        {governor.name} (이번주)
      </span>
      {hasPrevious && (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-slate-500" aria-hidden="true" />
          {governor.name} (지난주)
        </span>
      )}
    </div>
  );
}

ChartLegend.propTypes = {
  governor: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  hasPrevious: PropTypes.bool.isRequired,
};

export default function PrintReportChart({ governor, compact = false }) {
  const currentSeries = governor.currentChart ?? [];
  const previousSeries = governor.previousChart ?? [];
  const series = [...currentSeries, ...previousSeries];

  if (series.length === 0) {
    return (
      <section className={`print-report-chart rounded border border-slate-200 p-3${compact ? " print-report-chart-compact" : ""}`}>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{governor.name}</h3>
        <p className="flex h-40 items-center justify-center text-sm text-slate-500">측정값 없음</p>
      </section>
    );
  }

  const range = calculateSeriesRange(series);
  const ticks = axisTicks(range);
  const currentPath = buildPath(currentSeries, range);
  const previousPath = buildPath(previousSeries, range);
  const firstTimestamp = currentSeries[0]?.timestamp ?? previousSeries[0]?.timestamp ?? "";
  const lastTimestamp =
    currentSeries[currentSeries.length - 1]?.timestamp ??
    previousSeries[previousSeries.length - 1]?.timestamp ??
    "";

  return (
    <section className={`print-report-chart rounded border border-slate-200 p-3${compact ? " print-report-chart-compact" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-slate-800">{governor.name}</h3>
        <ChartLegend governor={governor} hasPrevious={previousSeries.length > 0} />
      </div>
      <div className="print-report-chart-plot">
        <div className="print-report-chart-y-labels" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.y} style={{ top: `${(tick.y / VIEWBOX_HEIGHT) * 100}%` }}>
              {formatAxisValue(tick.value)}
            </span>
          ))}
        </div>
        <svg
          className="print-report-chart-svg block h-auto w-full"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio={compact ? "none" : "xMidYMid meet"}
          role="img"
          aria-label={`${governor.name} 압력 추이`}
        >
          {ticks.map((tick) => (
            <line
              key={tick.y}
              x1={PADDING.left}
              y1={tick.y}
              x2={VIEWBOX_WIDTH - PADDING.right}
              y2={tick.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          ))}
          <line
            x1={PADDING.left}
            y1={VIEWBOX_HEIGHT - PADDING.bottom}
            x2={VIEWBOX_WIDTH - PADDING.right}
            y2={VIEWBOX_HEIGHT - PADDING.bottom}
            stroke="#64748b"
            strokeWidth="1"
          />
          {currentPath && <path d={currentPath} fill="none" stroke={CURRENT_COLOR} strokeWidth="2.5" />}
          {previousPath && (
            <path
              d={previousPath}
              fill="none"
              stroke={PREVIOUS_COLOR}
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}
        </svg>
        <div className="print-report-chart-x-labels" aria-hidden="true">
          <span>{firstTimestamp}</span>
          <span>{lastTimestamp}</span>
        </div>
      </div>
    </section>
  );
}

PrintReportChart.propTypes = {
  governor: PropTypes.shape({
    name: PropTypes.string.isRequired,
    currentChart: PropTypes.arrayOf(
      PropTypes.shape({ timestamp: PropTypes.string, value: PropTypes.number })
    ),
    previousChart: PropTypes.arrayOf(
      PropTypes.shape({ timestamp: PropTypes.string, value: PropTypes.number })
    ),
  }).isRequired,
  compact: PropTypes.bool,
};
