import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import DataGrid from "@/components/ui/DataGrid.jsx";
import { INSPECTION_DAY_OPTIONS, MAX_SELECTED_GOVERNORS } from "@/constants/domain.js";

const DAY_LABEL_BY_CODE = Object.fromEntries(INSPECTION_DAY_OPTIONS.map((o) => [o.value, o.label]));
const DAY_ORDER_BY_CODE = Object.fromEntries(INSPECTION_DAY_OPTIONS.map((o, index) => [o.value, index]));

function compareValues(left, right, sortKey) {
  if (sortKey === "inspct_day") {
    return (DAY_ORDER_BY_CODE[left] ?? Number.MAX_SAFE_INTEGER) -
      (DAY_ORDER_BY_CODE[right] ?? Number.MAX_SAFE_INTEGER);
  }

  return String(left ?? "").localeCompare(String(right ?? ""), "ko");
}

function SortableHeader({ label, sortKey, sort, onSort }) {
  const isActive = sort.key === sortKey;
  const directionLabel = isActive ? (sort.direction === "asc" ? "오름차순" : "내림차순") : "정렬 안 함";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 whitespace-nowrap font-medium hover:text-slate-800"
      onClick={() => onSort(sortKey)}
      aria-label={`${label} ${directionLabel}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-[10px] text-slate-400">
        {isActive ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

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
  const [sort, setSort] = useState({ key: "inspct_day", direction: "asc" });

  const sortedGovernors = useMemo(() => {
    return governors
      .map((governor, index) => ({ governor, index }))
      .sort((left, right) => {
        const primary = compareValues(left.governor[sort.key], right.governor[sort.key], sort.key);
        if (primary !== 0) return primary * (sort.direction === "asc" ? 1 : -1);

        const secondaryKey = sort.key === "gvrnr_nm" ? "inspct_day" : "gvrnr_nm";
        const secondary = compareValues(
          left.governor[secondaryKey],
          right.governor[secondaryKey],
          secondaryKey
        );
        if (secondary !== 0) return secondary;
        return left.index - right.index;
      })
      .map(({ governor }) => governor);
  }, [governors, sort]);

  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const columns = [
    {
      key: "gvrnr_nm",
      width: "18rem",
      header: <SortableHeader label="정압기명" sortKey="gvrnr_nm" sort={sort} onSort={handleSort} />,
      cellClassName: "truncate whitespace-nowrap text-slate-800",
    },
    { key: "cd_name", width: "8rem", header: "지역", cellClassName: "whitespace-nowrap text-slate-600" },
    {
      key: "inspct_day",
      width: "8rem",
      header: <SortableHeader label="점검요일" sortKey="inspct_day" sort={sort} onSort={handleSort} />,
      cellClassName: "whitespace-nowrap text-slate-600",
      render: (g) => DAY_LABEL_BY_CODE[g.inspct_day] ?? g.inspct_day,
    },
    {
      key: "gvrnr_stat_cnt",
      width: "8rem",
      header: "측정건수",
      align: "right",
      cellClassName: "whitespace-nowrap text-slate-600",
    },
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
      rows={sortedGovernors}
      rowKey={(g) => g.gvrnr_uid}
      fixedLayout
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
