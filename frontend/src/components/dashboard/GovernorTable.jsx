import PropTypes from "prop-types";
import { INSPECTION_DAY_OPTIONS, MAX_SELECTED_GOVERNORS } from "../../constants/domain.js";

const DAY_LABEL_BY_CODE = Object.fromEntries(INSPECTION_DAY_OPTIONS.map((o) => [o.value, o.label]));

/**
 * @param {{
 *   governors: Array<{ gvrnr_uid: string, gvrnr_nm: string, inspct_day: string, gvrnr_stat_cnt: number, cd_name: string }>,
 *   selected: Array<{ gvrnr_uid: string, gvrnr_nm: string }>,
 *   onToggle: (governor: object) => void,
 * }} props
 */
export default function GovernorTable({ governors, selected, onToggle }) {
  const isMaxSelected = selected.length >= MAX_SELECTED_GOVERNORS;
  const selectedUids = new Set(selected.map((g) => g.gvrnr_uid));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">검색 결과</h2>
        <span className="text-xs text-slate-500">최대 {MAX_SELECTED_GOVERNORS}개 선택 ({selected.length}/{MAX_SELECTED_GOVERNORS})</span>
      </div>

      {governors.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="w-10 px-4 py-2"></th>
                <th className="px-2 py-2">정압기명</th>
                <th className="px-2 py-2">지역</th>
                <th className="px-2 py-2">점검요일</th>
                <th className="px-2 py-2 text-right">측정건수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {governors.map((governor) => {
                const checked = selectedUids.has(governor.gvrnr_uid);
                const disabled = !checked && isMaxSelected;
                return (
                  <tr key={governor.gvrnr_uid} className={disabled ? "opacity-50" : undefined}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggle(governor)}
                        aria-label={`${governor.gvrnr_nm} 선택`}
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-800">{governor.gvrnr_nm}</td>
                    <td className="px-2 py-2 text-slate-600">{governor.cd_name}</td>
                    <td className="px-2 py-2 text-slate-600">{DAY_LABEL_BY_CODE[governor.inspct_day] ?? governor.inspct_day}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{governor.gvrnr_stat_cnt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

GovernorTable.propTypes = {
  governors: PropTypes.arrayOf(
    PropTypes.shape({
      gvrnr_uid: PropTypes.string.isRequired,
      gvrnr_nm: PropTypes.string.isRequired,
      inspct_day: PropTypes.string,
      gvrnr_stat_cnt: PropTypes.number,
      cd_name: PropTypes.string,
    })
  ).isRequired,
  selected: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
};
