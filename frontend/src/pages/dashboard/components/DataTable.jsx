import PropTypes from "prop-types";

/**
 * 측정 데이터 테이블. xAxisList와 각 정압기의 gvrnr_press2 배열은 동일한 길이로 인덱스 정렬되어 있다고 가정한다
 * (generate_series() 기반 균일 시간 버킷, docs/plan.md 섹션 6 참고).
 *
 * @param {{
 *   xAxisList: string[],
 *   statDataObj: Record<string, { gvrnr_nm: string, gvrnr_press2: number[] }> | null,
 * }} props
 */
export default function DataTable({ xAxisList, statDataObj }) {
  const governors = Object.entries(statDataObj ?? {});

  if (governors.length === 0 || xAxisList.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">측정 데이터</h2>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">측정일</th>
              {governors.map(([gvrnrUid, gov]) => (
                <th key={gvrnrUid} className="px-2 py-2 text-right">
                  {gov.gvrnr_nm} (2차압력)
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {xAxisList.map((timestamp, index) => (
              <tr key={timestamp}>
                <td className="px-4 py-1.5 text-slate-600">{timestamp}</td>
                {governors.map(([gvrnrUid, gov]) => (
                  <td key={gvrnrUid} className="px-2 py-1.5 text-right text-slate-800">
                    {gov.gvrnr_press2?.[index] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

DataTable.propTypes = {
  xAxisList: PropTypes.arrayOf(PropTypes.string).isRequired,
  statDataObj: PropTypes.object,
};
