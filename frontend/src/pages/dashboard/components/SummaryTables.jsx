import PropTypes from "prop-types";

/** @param {number[]} values */
function summarize(values) {
  const numeric = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (numeric.length === 0) return { min: "-", avg: "-", max: "-" };

  const sum = numeric.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.min(...numeric).toFixed(2),
    avg: (sum / numeric.length).toFixed(2),
    max: Math.max(...numeric).toFixed(2),
  };
}

/**
 * 정압기별 2차 압력 MIN/AVG/MAX 요약 카드 (최대 3개).
 * @param {{ statDataObj: Record<string, { gvrnr_nm: string, gvrnr_press2: number[] }> | null }} props
 */
export default function SummaryTables({ statDataObj }) {
  const governors = Object.entries(statDataObj ?? {});

  if (governors.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {governors.map(([gvrnrUid, gov]) => {
        const { min, avg, max } = summarize(gov.gvrnr_press2 ?? []);
        return (
          <div key={gvrnrUid} className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{gov.gvrnr_nm}</h3>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-500">MIN</dt>
                <dd className="text-sm font-medium text-slate-800">{min}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">AVG</dt>
                <dd className="text-sm font-medium text-slate-800">{avg}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">MAX</dt>
                <dd className="text-sm font-medium text-slate-800">{max}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

SummaryTables.propTypes = {
  statDataObj: PropTypes.object,
};
