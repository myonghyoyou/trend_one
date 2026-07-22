import PropTypes from "prop-types";
import PrintReportChart from "./PrintReportChart.jsx";
import { formatReportValue } from "@/pages/dashboard/utils/reportModel.js";

function displayValue(value) {
  return value || "전체";
}

function GovernorSummaryCard({ governor, compareMode }) {
  return (
    <aside className="print-report-governor-summary rounded border border-slate-300 bg-slate-50 p-3">
      <div className="mb-2 border-b border-slate-300 pb-1 text-center">
        <h3 className="break-words text-sm font-semibold text-slate-900">{governor.name}</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {governor.region || "-"} · 측정 {Number(governor.measurementCount).toLocaleString("ko-KR")}건
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <SummaryValues summary={governor.currentSummary} />
        {compareMode && <SummaryValues label="지난주" summary={governor.previousSummary} muted />}
      </div>
      {compareMode && governor.avgDelta !== null && (
        <p className="mt-2 border-t border-slate-200 pt-1 text-center text-xs text-slate-600">
          AVG Δ {governor.avgDelta > 0 ? "+" : ""}{governor.avgDelta.toFixed(2)}
        </p>
      )}
    </aside>
  );
}

function SummaryValues({ label, summary, muted = false }) {
  return (
    <div className={muted ? "text-slate-500" : "text-slate-800"}>
      {label && <p className="mb-1 text-center text-xs font-medium">{label}</p>}
      <dl className="grid grid-cols-1 gap-1">
        <div className="flex items-center justify-between gap-2"><dt>MAX</dt><dd className="text-base font-semibold">{formatReportValue(summary?.max)}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt>MIN</dt><dd className="text-base font-semibold">{formatReportValue(summary?.min)}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt>AVG</dt><dd className="text-base font-semibold">{formatReportValue(summary?.avg)}</dd></div>
      </dl>
    </div>
  );
}

SummaryValues.propTypes = {
  label: PropTypes.string,
  summary: PropTypes.shape({ min: PropTypes.number, avg: PropTypes.number, max: PropTypes.number }),
  muted: PropTypes.bool,
};

GovernorSummaryCard.propTypes = {
  governor: PropTypes.object.isRequired,
  compareMode: PropTypes.bool.isRequired,
};

function ReportHeader({ metadata, inspectionDay }) {
  return (
    <header className="print-report-title mb-5 border-b border-slate-300 pb-4">
      <h1 className="text-xl font-semibold">{metadata.title}</h1>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="inline text-slate-500">조회 기간: </dt><dd className="inline">{metadata.startDate} ~ {metadata.endDate}</dd></div>
        <div><dt className="inline text-slate-500">지역: </dt><dd className="inline">{displayValue(metadata.region)}</dd></div>
        <div><dt className="inline text-slate-500">점검요일: </dt><dd className="inline">{displayValue(inspectionDay)}</dd></div>
        <div><dt className="inline text-slate-500">정압기명: </dt><dd className="inline">{displayValue(metadata.governorKeyword)}</dd></div>
        <div><dt className="inline text-slate-500">생성 시각: </dt><dd className="inline">{metadata.generatedAt || "-"}</dd></div>
      </dl>
    </header>
  );
}

ReportHeader.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    region: PropTypes.string,
    governorKeyword: PropTypes.string,
    generatedAt: PropTypes.string,
  }).isRequired,
  inspectionDay: PropTypes.string.isRequired,
};

function WeekdaySection({ section, metadata, compareMode }) {
  return (
    <section className="print-report-weekday-section">
      <ReportHeader metadata={metadata} inspectionDay={section.label} />
      <div className="print-report-weekday-heading">
        <h2 className="text-base font-semibold text-slate-800">{section.code} ({section.label})</h2>
      </div>
      {section.governors.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center text-sm text-slate-500">측정값 없음</p>
      ) : (
        <div className="print-report-governor-list">
          {section.governors.map((governor) => (
            <div key={governor.uid} className="print-report-governor-row">
              <GovernorSummaryCard governor={governor} compareMode={compareMode} />
              <PrintReportChart governor={governor} compact />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

WeekdaySection.propTypes = {
  section: PropTypes.shape({
    code: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    governors: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  metadata: PropTypes.object.isRequired,
  compareMode: PropTypes.bool.isRequired,
};

export default function PrintReport({ model, onClose }) {
  const { metadata } = model;

  return (
    <section className="print-report mx-auto max-w-6xl bg-white p-6 text-slate-900" aria-label="인쇄용 보고서">
      <div className="print-report-actions mb-4 flex items-center justify-end gap-2">
        <div className="mr-auto text-sm text-slate-600 print:hidden">
          주간 보고서 · 월~금 · 인쇄 대상 {Number(metadata.targetCount ?? 0).toLocaleString("ko-KR")}개 · {metadata.intervalNum || "20"}분 간격
        </div>
        <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={() => window.print()}>
          인쇄 실행
        </button>
        <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={onClose}>
          뒤로가기
        </button>
      </div>

      {model.governors.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">조회된 데이터가 없습니다.</p>
      ) : (
        <div className="print-report-weekday-pages">
          {model.weekdaySections.map((section) => (
            <WeekdaySection
              key={section.code}
              section={section}
              metadata={metadata}
              compareMode={model.compareMode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

PrintReport.propTypes = {
  model: PropTypes.shape({
    metadata: PropTypes.shape({
      title: PropTypes.string.isRequired,
      startDate: PropTypes.string.isRequired,
      endDate: PropTypes.string.isRequired,
      region: PropTypes.string,
      inspectionDay: PropTypes.string,
      governorKeyword: PropTypes.string,
      intervalNum: PropTypes.string,
      targetCount: PropTypes.number,
      generatedAt: PropTypes.string,
    }).isRequired,
    compareMode: PropTypes.bool.isRequired,
    governors: PropTypes.arrayOf(PropTypes.object).isRequired,
    weekdaySections: PropTypes.arrayOf(PropTypes.object).isRequired,
    measurementRows: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
