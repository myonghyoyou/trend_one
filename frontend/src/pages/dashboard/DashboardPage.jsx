import { useEffect, useRef, useState } from "react";
import SearchForm from "@/pages/dashboard/components/SearchForm.jsx";
import GovernorTable from "@/pages/dashboard/components/GovernorTable.jsx";
import StatsChart from "@/pages/dashboard/components/StatsChart.jsx";
import DataTable from "@/pages/dashboard/components/DataTable.jsx";
import SummaryTables from "@/pages/dashboard/components/SummaryTables.jsx";
import PrintReport from "@/pages/dashboard/components/PrintReport.jsx";
import WeeklyReportDialog from "@/pages/dashboard/components/WeeklyReportDialog.jsx";
import ExcelUpload from "@/pages/dashboard/components/ExcelUpload.jsx";
import LogoutButton from "@/pages/dashboard/components/LogoutButton.jsx";
import Button from "@/components/ui/Button.jsx";
import Select from "@/components/ui/Select.jsx";
import Checkbox from "@/components/ui/Checkbox.jsx";
import Loader from "@/components/ui/Loader.jsx";
import { useModal } from "@/contexts/ModalContext.jsx";
import { searchGovernors, fetchGovernorStats, fetchPrintGovernorStats } from "@/api/governors.js";
import { resolveErrorMessage } from "@/api/client.js";
import { getPreviousPeriod, mergeWeeklyComparison } from "@/utils/weekCompare.js";
import { today } from "@/utils/dateUtil.js";
import { INSPECTION_DAY_OPTIONS, INTERVAL_OPTIONS, REGION_OPTIONS } from "@/constants/domain.js";
import { buildPrintReportModel } from "@/pages/dashboard/utils/reportModel.js";
import {
  getLatestCompletedWeekPeriod,
  PRINT_INTERVAL,
  validateWeekdayReportPeriod,
} from "@/pages/dashboard/utils/weeklyReportPeriod.js";

const DEFAULT_INTERVAL = "1";
const STATS_DEBOUNCE_MS = 300;

function resolveOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? "";
}

export default function DashboardPage() {
  const { openAlert } = useModal();

  const [governors, setGovernors] = useState([]);
  const [selectedGovernors, setSelectedGovernors] = useState([]);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [intervalNum, setIntervalNum] = useState(DEFAULT_INTERVAL);
  const [searching, setSearching] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [isWeeklyReportDialogOpen, setIsWeeklyReportDialogOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState(() => getLatestCompletedWeekPeriod(today()));
  const [reportSearchParams, setReportSearchParams] = useState(null);
  const [reportGovernors, setReportGovernors] = useState([]);
  const [reportStatsData, setReportStatsData] = useState(null);
  const [reportGeneratedAt, setReportGeneratedAt] = useState("");
  const [reportError, setReportError] = useState("");
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const statsDebounceTimerRef = useRef(null);
  const statsAbortControllerRef = useRef(null);
  const statsRequestIdRef = useRef(0);
  const printAbortControllerRef = useRef(null);
  const printRequestIdRef = useRef(0);

  const cancelPendingStats = () => {
    if (statsDebounceTimerRef.current !== null) {
      clearTimeout(statsDebounceTimerRef.current);
      statsDebounceTimerRef.current = null;
    }
    statsRequestIdRef.current += 1;
    statsAbortControllerRef.current?.abort();
    statsAbortControllerRef.current = null;
    setLoadingStats(false);
  };

  const cancelPendingReport = () => {
    printRequestIdRef.current += 1;
    printAbortControllerRef.current?.abort();
    printAbortControllerRef.current = null;
    setIsPreparingReport(false);
  };

  const resetWeeklyReport = () => {
    cancelPendingReport();
    setIsWeeklyReportDialogOpen(false);
    setIsPrintPreview(false);
    setReportSearchParams(null);
    setReportGovernors([]);
    setReportStatsData(null);
    setReportGeneratedAt("");
    setReportError("");
  };

  const fetchStats = async (
    interval,
    compare,
    governors = selectedGovernors,
    searchParams = lastSearchParams
  ) => {
    if (governors.length === 0 || !searchParams) {
      setStatsData(null);
      setLoadingStats(false);
      return;
    }

    statsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++statsRequestIdRef.current;
    statsAbortControllerRef.current = controller;
    setLoadingStats(true);

    try {
      const baseParams = {
        gvrnrUids: governors.map((g) => g.gvrnr_uid).join(","),
        gvrnrNms: governors.map((g) => g.gvrnr_nm).join(","),
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        intervalNum: interval,
      };

      let nextStatsData;
      if (!compare) {
        nextStatsData = await fetchGovernorStats(baseParams, controller.signal);
      } else {
        const previousPeriod = getPreviousPeriod(searchParams.startDate, searchParams.endDate);
        const [thisWeekRes, lastWeekRes] = await Promise.all([
          fetchGovernorStats(baseParams, controller.signal),
          fetchGovernorStats(
            {
              ...baseParams,
              startDate: previousPeriod.startDate,
              endDate: previousPeriod.endDate,
            },
            controller.signal
          ),
        ]);
        nextStatsData = {
          xAxisList: thisWeekRes.xAxisList,
          statDataObj: mergeWeeklyComparison(thisWeekRes, lastWeekRes, previousPeriod.shiftDays),
        };
      }

      if (requestId === statsRequestIdRef.current) {
        setStatsData(nextStatsData);
      }
    } catch (error) {
      if (error?.name === "AbortError" || requestId !== statsRequestIdRef.current) return;
      openAlert(resolveErrorMessage(error, "조회 중 오류가 발생했습니다."), "FAIL");
    } finally {
      if (requestId === statsRequestIdRef.current) {
        setLoadingStats(false);
        statsAbortControllerRef.current = null;
      }
    }
  };

  const scheduleStatsFetch = (governors, interval = intervalNum, compare = compareMode) => {
    cancelPendingStats();
    if (governors.length === 0) {
      setStatsData(null);
      return;
    }

    setLoadingStats(true);
    statsDebounceTimerRef.current = setTimeout(() => {
      statsDebounceTimerRef.current = null;
      fetchStats(interval, compare, governors);
    }, STATS_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (statsDebounceTimerRef.current !== null) {
        clearTimeout(statsDebounceTimerRef.current);
      }
      statsAbortControllerRef.current?.abort();
      printAbortControllerRef.current?.abort();
    };
  }, []);

  const handleSearch = async (values) => {
    resetWeeklyReport();
    cancelPendingStats();
    setSearching(true);
    try {
      const res = await searchGovernors(values);
      setGovernors(res.gvrnrList ?? []);
      setSelectedGovernors([]);
      setStatsData(null);
      setLastSearchParams(values);
    } catch (error) {
      openAlert(resolveErrorMessage(error, "검색 중 오류가 발생했습니다."), "FAIL");
    } finally {
      setSearching(false);
    }
  };

  const handleToggleGovernor = (governor) => {
    resetWeeklyReport();
    const exists = selectedGovernors.some((g) => g.gvrnr_uid === governor.gvrnr_uid);
    if (!exists && selectedGovernors.length >= 3) return;

    const next = exists
      ? selectedGovernors.filter((g) => g.gvrnr_uid !== governor.gvrnr_uid)
      : [...selectedGovernors, governor];

    setSelectedGovernors(next);
    scheduleStatsFetch(next);
  };

  const handleIntervalChange = (event) => {
    resetWeeklyReport();
    const value = event.target.value;
    setIntervalNum(value);
    if (selectedGovernors.length > 0) scheduleStatsFetch(selectedGovernors, value, compareMode);
  };

  const handleCompareToggle = (event) => {
    resetWeeklyReport();
    const checked = event.target.checked;
    setCompareMode(checked);
    if (selectedGovernors.length > 0) scheduleStatsFetch(selectedGovernors, intervalNum, checked);
  };

  const handleOpenWeeklyReportDialog = () => {
    if (!lastSearchParams || governors.length === 0 || loadingStats || isPreparingReport) return;

    cancelPendingReport();
    setReportPeriod(getLatestCompletedWeekPeriod(today()));
    setReportError("");
    setIsWeeklyReportDialogOpen(true);
  };

  const handleCancelWeeklyReport = () => {
    cancelPendingReport();
    setReportError("");
    setIsWeeklyReportDialogOpen(false);
  };

  const handlePrepareWeeklyReport = async (period) => {
    if (!lastSearchParams || isPreparingReport) return;

    const validation = validateWeekdayReportPeriod(period.startDate, period.endDate);
    if (!validation.valid) {
      setReportError(validation.message);
      return;
    }

    cancelPendingReport();
    const controller = new AbortController();
    const requestId = ++printRequestIdRef.current;
    printAbortControllerRef.current = controller;
    setIsPreparingReport(true);
    setReportError("");

    const nextReportSearchParams = {
      ...lastSearchParams,
      startDate: period.startDate,
      endDate: period.endDate,
    };

    try {
      const reportListResponse = await searchGovernors(nextReportSearchParams, controller.signal);
      if (requestId !== printRequestIdRef.current) return;

      const nextReportGovernors = reportListResponse.gvrnrList ?? [];
      if (nextReportGovernors.length === 0) {
        setReportError("선택한 주간 기간에 해당하는 정압기 측정 대상이 없습니다.");
        return;
      }

      const printParams = {
        gvrnrUids: nextReportGovernors.map((governor) => governor.gvrnr_uid).join(","),
        gvrnrNms: nextReportGovernors.map((governor) => governor.gvrnr_nm).join(","),
        startDate: period.startDate,
        endDate: period.endDate,
        intervalNum: PRINT_INTERVAL,
      };
      const nextReportStatsData = await fetchPrintGovernorStats(printParams, controller.signal);

      if (requestId === printRequestIdRef.current) {
        setReportPeriod(period);
        setReportSearchParams(nextReportSearchParams);
        setReportGovernors(nextReportGovernors);
        setReportStatsData(nextReportStatsData);
        setReportGeneratedAt(new Date().toLocaleString("ko-KR"));
        setIsWeeklyReportDialogOpen(false);
        setIsPrintPreview(true);
      }
    } catch (error) {
      if (error?.name !== "AbortError" && requestId === printRequestIdRef.current) {
        setReportError(resolveErrorMessage(error, "주간 보고서 데이터를 조회하지 못했습니다."));
      }
    } finally {
      if (requestId === printRequestIdRef.current) {
        setIsPreparingReport(false);
        printAbortControllerRef.current = null;
      }
    }
  };

  const printModel = buildPrintReportModel({
    searchParams: reportSearchParams ?? {},
    selectedGovernors: reportGovernors,
    statsData: reportStatsData ?? {},
    compareMode: false,
    intervalNum: PRINT_INTERVAL,
    generatedAt: reportGeneratedAt,
    includeMeasurementRows: false,
  });

  if (isPrintPreview) {
    return <PrintReport model={printModel} onClose={() => setIsPrintPreview(false)} />;
  }

  return (
    <div className="dashboard-page min-h-screen bg-slate-50 pb-10">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">정압기 관리 시스템</h1>
        <div className="flex items-center gap-2">
          <ExcelUpload onUploaded={() => lastSearchParams && handleSearch(lastSearchParams)} />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <SearchForm onSearch={handleSearch} isSearching={searching} />

        <GovernorTable governors={governors} selected={selectedGovernors} onToggle={handleToggleGovernor} />

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label htmlFor="intervalNum" className="text-sm text-slate-600">
            조회 간격
          </label>
          <Select
            id="intervalNum"
            options={INTERVAL_OPTIONS}
            value={intervalNum}
            onChange={handleIntervalChange}
          />
          <label htmlFor="compareMode" className="flex items-center gap-1.5 text-sm text-slate-600">
            <Checkbox id="compareMode" checked={compareMode} onChange={handleCompareToggle} />
            지난주와 비교
          </label>
          <Button
            type="button"
            variant="secondary"
            className="ml-auto"
            onClick={handleOpenWeeklyReportDialog}
            disabled={governors.length === 0 || !lastSearchParams || loadingStats || isPreparingReport}
          >
            주간 보고서 생성
          </Button>
        </div>

        <StatsChart statDataObj={statsData?.statDataObj} />
        <SummaryTables statDataObj={statsData?.statDataObj} />
        <DataTable xAxisList={statsData?.xAxisList ?? []} statDataObj={statsData?.statDataObj} />
      </main>

      <Loader visible={loadingStats} message="조회 중..." />
      <WeeklyReportDialog
        isOpen={isWeeklyReportDialogOpen}
        initialPeriod={reportPeriod}
        targetCount={governors.length}
        searchSummary={{
          region: resolveOptionLabel(REGION_OPTIONS, lastSearchParams?.srchCity),
          inspectionDay: resolveOptionLabel(INSPECTION_DAY_OPTIONS, lastSearchParams?.inspctDay),
          keyword: lastSearchParams?.srchCntnt ?? "",
        }}
        isPreparing={isPreparingReport}
        error={reportError}
        onCancel={handleCancelWeeklyReport}
        onSubmit={handlePrepareWeeklyReport}
      />
    </div>
  );
}
