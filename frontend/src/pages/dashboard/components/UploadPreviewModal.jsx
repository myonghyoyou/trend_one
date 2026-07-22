import PropTypes from "prop-types";
import Button from "@/components/ui/Button.jsx";
import Checkbox from "@/components/ui/Checkbox.jsx";

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

function formatBytes(value) {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPreviewModal({ preview, allowDeleteOnly, onAllowDeleteOnlyChange, onConfirm, onCancel }) {
  const impact = preview.impact ?? {};
  const requiresDeleteConsent = Number(impact.deleteOnlyRecordCount ?? 0) > 0;
  const sheets = impact.sheets ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-preview-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="upload-preview-title" className="text-lg font-semibold text-slate-900">
          업로드 전 데이터 확인
        </h2>
        <p className="mt-1 break-all text-sm text-slate-600">
          {preview.fileName} ({formatBytes(preview.fileSize)})
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <SummaryItem label="정압기" value={impact.governorCount} />
          <SummaryItem label="업로드 건수" value={impact.uploadRecordCount} />
          <SummaryItem label="대체 건수" value={impact.replacementRecordCount} />
          <SummaryItem label="신규 건수" value={impact.newRecordCount} />
          <SummaryItem label="신규 정압기" value={impact.newGovernorCount} />
          <SummaryItem label="기존 영향" value={impact.existingAffectedRecordCount} />
          <SummaryItem label="삭제 전용" value={impact.deleteOnlyRecordCount} danger={requiresDeleteConsent} />
          <SummaryItem label="요일 변경" value={impact.inspectionDayChangeCount} />
        </div>

        {sheets.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">시트</th>
                  <th className="px-3 py-2 font-medium">점검요일</th>
                  <th className="px-3 py-2 text-right font-medium">정압기</th>
                  <th className="px-3 py-2 text-right font-medium">행</th>
                  <th className="px-3 py-2 text-right font-medium">측정값</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={`${sheet.sheetName}-${sheet.inspctDay}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{sheet.sheetName}</td>
                    <td className="px-3 py-2">{sheet.inspctDay}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(sheet.governorCount)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(sheet.rowCount)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(sheet.measurementCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {impact.warnings?.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">주의가 필요한 변경입니다.</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {impact.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        {requiresDeleteConsent && (
          <label className="mt-4 flex items-start gap-2 text-sm text-red-700">
            <Checkbox
              checked={allowDeleteOnly}
              onChange={(event) => onAllowDeleteOnlyChange(event.target.checked)}
            />
            <span>업로드 파일에 없는 기존 측정 데이터도 삭제될 수 있음을 확인했습니다.</span>
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>취소</Button>
          <Button variant={requiresDeleteConsent ? "danger" : "primary"} onClick={onConfirm} disabled={requiresDeleteConsent && !allowDeleteOnly}>
            업로드 진행
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, danger = false }) {
  return (
    <div className={danger ? "rounded border border-red-200 bg-red-50 p-2" : "rounded border border-slate-200 p-2"}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={danger ? "mt-1 font-semibold text-red-700" : "mt-1 font-semibold text-slate-900"}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

SummaryItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  danger: PropTypes.bool,
};

UploadPreviewModal.propTypes = {
  preview: PropTypes.shape({
    fileName: PropTypes.string,
    fileSize: PropTypes.number,
    impact: PropTypes.shape({
      governorCount: PropTypes.number,
      uploadRecordCount: PropTypes.number,
      replacementRecordCount: PropTypes.number,
      newRecordCount: PropTypes.number,
      newGovernorCount: PropTypes.number,
      existingAffectedRecordCount: PropTypes.number,
      deleteOnlyRecordCount: PropTypes.number,
      inspectionDayChangeCount: PropTypes.number,
      sheets: PropTypes.arrayOf(PropTypes.object),
      warnings: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
  allowDeleteOnly: PropTypes.bool.isRequired,
  onAllowDeleteOnlyChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
