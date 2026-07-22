import PropTypes from "prop-types";

/** @param {Array<number|null>} values */
function summarize(values) {
  const numeric = (values ?? []).filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (numeric.length === 0) return { min: null, avg: null, max: null };

  const sum = numeric.reduce((acc, v) => acc + v, 0);
  return { min: Math.min(...numeric), avg: sum / numeric.length, max: Math.max(...numeric) };
}

/** @param {number|null} value */
function formatStat(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

/**
 * @param {number|null} thisAvg
 * @param {number|null} lastAvg
 * @returns {string|null}
 */
function formatDelta(thisAvg, lastAvg) {
  if (typeof thisAvg !== "number" || typeof lastAvg !== "number") return null;
  const diff = thisAvg - lastAvg;
  return `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
}

function WeeklyComparisonStats({ thisWeek, lastWeek }) {
  const delta = formatDelta(thisWeek.avg, lastWeek.avg);

  return (
    <>
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="w-12 text-left font-normal" />
            <th className="font-normal">MIN</th>
            <th className="font-normal">AVG</th>
            <th className="font-normal">MAX</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-left text-xs text-slate-500">이번주</td>
            <td>{formatStat(thisWeek.min)}</td>
            <td className="font-medium text-slate-800">{formatStat(thisWeek.avg)}</td>
            <td>{formatStat(thisWeek.max)}</td>
          </tr>
          <tr className="text-slate-400">
            <td className="text-left text-xs">지난주</td>
            <td>{formatStat(lastWeek.min)}</td>
            <td>{formatStat(lastWeek.avg)}</td>
            <td>{formatStat(lastWeek.max)}</td>
          </tr>
        </tbody>
      </table>
      {delta !== null && (
        <p className="mt-2 text-center text-xs text-slate-500">
          AVG Δ: <span className="font-medium text-slate-700">{delta}</span>
        </p>
      )}
    </>
  );
}

WeeklyComparisonStats.propTypes = {
  thisWeek: PropTypes.shape({
    min: PropTypes.number,
    avg: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  lastWeek: PropTypes.shape({
    min: PropTypes.number,
    avg: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
};

/**
 * 정압기별 2차 압력 MIN/AVG/MAX 요약 카드 (최대 3개). lastWeek 데이터가 있으면 이번주/지난주 비교 행을 추가한다.
 * @param {{ statDataObj: Record<string, { gvrnr_nm: string, gvrnr_press2: number[], lastWeek?: { gvrnr_press2: number[] } }> | null }} props
 */
export default function SummaryTables({ statDataObj }) {
  const governors = Object.entries(statDataObj ?? {});

  if (governors.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {governors.map(([gvrnrUid, gov]) => {
        const thisWeek = summarize(gov.gvrnr_press2);
        const lastWeek = gov.lastWeek ? summarize(gov.lastWeek.gvrnr_press2) : null;

        return (
          <div key={gvrnrUid} className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{gov.gvrnr_nm}</h3>
            {lastWeek ? (
              <WeeklyComparisonStats thisWeek={thisWeek} lastWeek={lastWeek} />
            ) : (
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs text-slate-500">MIN</dt>
                  <dd className="text-sm font-medium text-slate-800">{formatStat(thisWeek.min)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">AVG</dt>
                  <dd className="text-sm font-medium text-slate-800">{formatStat(thisWeek.avg)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">MAX</dt>
                  <dd className="text-sm font-medium text-slate-800">{formatStat(thisWeek.max)}</dd>
                </div>
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}

SummaryTables.propTypes = {
  statDataObj: PropTypes.object,
};
