import PropTypes from "prop-types";
import DataGrid from "../../../components/ui/DataGrid.jsx";
import { INSPECTION_DAY_OPTIONS, MAX_SELECTED_GOVERNORS } from "../../../constants/domain.js";

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

  const columns = [
    { key: "gvrnr_nm", header: "정압기명", cellClassName: "text-slate-800" },
    { key: "cd_name", header: "지역", cellClassName: "text-slate-600" },
    {
      key: "inspct_day",
      header: "점검요일",
      cellClassName: "text-slate-600",
      render: (g) => DAY_LABEL_BY_CODE[g.inspct_day] ?? g.inspct_day,
    },
    { key: "gvrnr_stat_cnt", header: "측정건수", align: "right", cellClassName: "text-slate-600" },
  ];

  return (
    <DataGrid
      title="검색 결과"
      headerRight={
        <span className="text-xs text-slate-500">
          최대 {MAX_SELECTED_GOVERNORS}개 선택 ({selected.length}/{MAX_SELECTED_GOVERNORS})
        </span>
      }
      columns={columns}
      rows={governors}
      rowKey={(g) => g.gvrnr_uid}
      selection={{
        isSelected: (g) => selectedUids.has(g.gvrnr_uid),
        isDisabled: (g) => !selectedUids.has(g.gvrnr_uid) && isMaxSelected,
        onToggle,
        ariaLabel: (g) => `${g.gvrnr_nm} 선택`,
      }}
      emptyText="검색 결과가 없습니다."
    />
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
