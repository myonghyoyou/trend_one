import PropTypes from "prop-types";
import DataGrid from "../../../components/ui/DataGrid.jsx";

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

  const columns = [
    {
      key: "_ts",
      header: "측정일",
      headerClassName: "px-4",
      cellClassName: "px-4 text-slate-600",
      render: (row) => row.timestamp,
    },
    ...governors.map(([gvrnrUid, gov]) => ({
      key: gvrnrUid,
      header: `${gov.gvrnr_nm} (2차압력)`,
      align: "right",
      cellClassName: "text-slate-800",
      render: (row) => gov.gvrnr_press2?.[row.index] ?? "-",
    })),
  ];

  const rows = xAxisList.map((timestamp, index) => ({ timestamp, index }));

  return (
    <DataGrid
      title="측정 데이터"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.timestamp}
      size="sm"
    />
  );
}

DataTable.propTypes = {
  xAxisList: PropTypes.arrayOf(PropTypes.string).isRequired,
  statDataObj: PropTypes.object,
};
