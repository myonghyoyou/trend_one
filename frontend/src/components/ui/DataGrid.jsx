import PropTypes from "prop-types";
import Checkbox from "@/components/ui/Checkbox.jsx";
import { cn } from "@/utils/cn.js";

const BODY_Y = { md: "py-2", sm: "py-1.5" };

function alignClass(align) {
  return align === "right" ? "text-right" : "";
}

/**
 * columnDefs 기반 경량 데이터 그리드. (CNTO DaeryunGrid의 columnDefs 개념을 축소 차용)
 *
 * columns: { key, header, width?, align?: "left"|"right", headerClassName?, cellClassName?, render?: (row) => node }
 * selection: { isSelected(row), onToggle(row), isDisabled?(row), ariaLabel?(row) } — 있으면 앞에 체크박스 컬럼 추가
 */
export default function DataGrid({
  title,
  headerRight,
  columns,
  rows,
  rowKey,
  selection,
  size = "md",
  emptyText = "데이터가 없습니다.",
  fixedLayout = false,
  className = "",
}) {
  const py = BODY_Y[size];

  return (
    <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white", className)}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
          {headerRight}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className={cn("w-full text-left text-sm", fixedLayout && "table-fixed")}>
            {fixedLayout && (
              <colgroup>
                {selection && <col key="selection" style={{ width: "3rem" }} />}
                {columns.map((col) => (
                  <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                ))}
              </colgroup>
            )}
            <thead className="text-xs text-slate-500">
              <tr>
                {selection && (
                  <th className="sticky top-0 z-20 w-10 bg-slate-50 px-2 py-2 text-center align-middle" />
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "sticky top-0 z-20 bg-slate-50 px-2 py-2",
                      alignClass(col.align),
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const disabled = selection?.isDisabled?.(row) ?? false;
                return (
                  <tr key={rowKey(row)} className={disabled ? "opacity-50" : undefined}>
                    {selection && (
                      <td className={cn("w-10 px-2 text-center align-middle", py)}>
                        <Checkbox
                          className="align-middle"
                          checked={selection.isSelected(row)}
                          disabled={disabled}
                          onChange={() => selection.onToggle(row)}
                          aria-label={selection.ariaLabel?.(row)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-2", py, alignClass(col.align), col.cellClassName)}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
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

const columnShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  header: PropTypes.node,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  align: PropTypes.oneOf(["left", "right"]),
  headerClassName: PropTypes.string,
  cellClassName: PropTypes.string,
  render: PropTypes.func,
});

DataGrid.propTypes = {
  title: PropTypes.string,
  headerRight: PropTypes.node,
  columns: PropTypes.arrayOf(columnShape).isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  selection: PropTypes.shape({
    isSelected: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    isDisabled: PropTypes.func,
    ariaLabel: PropTypes.func,
  }),
  size: PropTypes.oneOf(["md", "sm"]),
  emptyText: PropTypes.string,
  fixedLayout: PropTypes.bool,
  className: PropTypes.string,
};
