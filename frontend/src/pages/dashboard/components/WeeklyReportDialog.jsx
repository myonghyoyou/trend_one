import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Button from "@/components/ui/Button.jsx";
import TextInput from "@/components/ui/TextInput.jsx";
import {
  buildWeekdayReportPeriod,
  PRINT_INTERVAL,
  validateWeekdayReportPeriod,
} from "@/pages/dashboard/utils/weeklyReportPeriod.js";

function displayValue(value) {
  return value || "전체";
}

export default function WeeklyReportDialog({
  isOpen,
  initialPeriod,
  targetCount,
  searchSummary,
  isPreparing,
  error,
  onCancel,
  onSubmit,
}) {
  const [startDate, setStartDate] = useState(initialPeriod.startDate);

  useEffect(() => {
    if (isOpen) setStartDate(initialPeriod.startDate);
  }, [initialPeriod.startDate, isOpen]);

  const period = useMemo(() => buildWeekdayReportPeriod(startDate), [startDate]);
  const validation = useMemo(
    () => validateWeekdayReportPeriod(startDate, period.endDate),
    [period.endDate, startDate]
  );

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validation.valid || isPreparing) return;
    onSubmit(period);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-report-dialog-title"
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="weekly-report-dialog-title" className="text-lg font-semibold text-slate-900">
          주간 보고서 생성
        </h2>
        <p className="mt-1 text-sm text-slate-600">월요일부터 금요일까지의 주간 보고서를 생성합니다.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-700" htmlFor="weeklyReportStartDate">
            <span className="mb-1 block">보고서 시작일(월요일)</span>
            <TextInput
              id="weeklyReportStartDate"
              type="date"
              value={startDate}
              disabled={isPreparing}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <div className="text-sm text-slate-700">
            <span className="mb-1 block">보고서 종료일(금요일)</span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              {validation.valid ? period.endDate : "-"}
            </div>
          </div>
        </div>

        {!validation.valid && <p className="mt-2 text-sm text-red-600">{validation.message}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            인쇄 대상: 현재 검색 결과 {Number(targetCount).toLocaleString("ko-KR")}개 정압기
          </p>
          <p className="mt-1 text-xs text-slate-500">생성 시 선택한 주간 기간으로 대상을 다시 확인합니다.</p>
          <p className="mt-2">조회 간격: {PRINT_INTERVAL}분</p>
          <p className="mt-2 text-xs text-slate-500">
            검색 조건: 지역 {displayValue(searchSummary.region)} · 점검요일 {displayValue(searchSummary.inspectionDay)} · 정압기명 {displayValue(searchSummary.keyword)}
          </p>
        </div>

        {isPreparing && (
          <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
            <p className="font-medium">주간 보고서 데이터를 준비하고 있습니다.</p>
            <p className="mt-1 text-xs">검색 결과 확인 → 20분 간격 측정 데이터 조회</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {isPreparing ? "취소" : "닫기"}
          </Button>
          <Button type="submit" loading={isPreparing} disabled={!validation.valid}>
            {isPreparing ? "보고서 준비 중..." : "보고서 미리보기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

WeeklyReportDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  initialPeriod: PropTypes.shape({
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
  targetCount: PropTypes.number.isRequired,
  searchSummary: PropTypes.shape({
    region: PropTypes.string,
    inspectionDay: PropTypes.string,
    keyword: PropTypes.string,
  }).isRequired,
  isPreparing: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
