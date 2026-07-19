import { useState } from "react";
import SearchForm from "./components/SearchForm.jsx";
import GovernorTable from "./components/GovernorTable.jsx";
import StatsChart from "./components/StatsChart.jsx";
import DataTable from "./components/DataTable.jsx";
import SummaryTables from "./components/SummaryTables.jsx";
import ExcelUpload from "./components/ExcelUpload.jsx";
import LogoutButton from "./components/LogoutButton.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import Loader from "../../components/ui/Loader.jsx";
import { useModal } from "../../contexts/ModalContext.jsx";
import { searchGovernors, fetchGovernorStats } from "../../api/governors.js";
import { ApiError } from "../../api/client.js";
import { INTERVAL_OPTIONS } from "../../constants/domain.js";

const DEFAULT_INTERVAL = "1";

export default function DashboardPage() {
  const { openAlert } = useModal();

  const [governors, setGovernors] = useState([]);
  const [selectedGovernors, setSelectedGovernors] = useState([]);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [intervalNum, setIntervalNum] = useState(DEFAULT_INTERVAL);
  const [searching, setSearching] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleSearch = async (values) => {
    setSearching(true);
    try {
      const res = await searchGovernors(values);
      setGovernors(res.gvrnrList ?? []);
      setSelectedGovernors([]);
      setStatsData(null);
      setLastSearchParams(values);
    } catch (error) {
      openAlert(error instanceof ApiError ? error.message : "검색 중 오류가 발생했습니다.", "FAIL");
    } finally {
      setSearching(false);
    }
  };

  const handleToggleGovernor = (governor) => {
    setSelectedGovernors((prev) => {
      const exists = prev.some((g) => g.gvrnr_uid === governor.gvrnr_uid);
      if (exists) return prev.filter((g) => g.gvrnr_uid !== governor.gvrnr_uid);
      if (prev.length >= 3) return prev;
      return [...prev, governor];
    });
  };

  const fetchStats = async (interval) => {
    if (selectedGovernors.length === 0 || !lastSearchParams) return;
    setLoadingStats(true);
    try {
      const res = await fetchGovernorStats({
        gvrnrUids: selectedGovernors.map((g) => g.gvrnr_uid).join(","),
        gvrnrNms: selectedGovernors.map((g) => g.gvrnr_nm).join(","),
        startDate: lastSearchParams.startDate,
        endDate: lastSearchParams.endDate,
        intervalNum: interval,
      });
      setStatsData(res);
    } catch (error) {
      openAlert(error instanceof ApiError ? error.message : "조회 중 오류가 발생했습니다.", "FAIL");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleInquire = () => {
    if (selectedGovernors.length === 0) {
      openAlert("정압기를 선택하세요.", "FAIL");
      return;
    }
    fetchStats(intervalNum);
  };

  const handleIntervalChange = (event) => {
    const value = event.target.value;
    setIntervalNum(value);
    if (statsData) fetchStats(value);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
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
          <Button onClick={handleInquire} disabled={loadingStats}>
            {loadingStats ? "조회 중..." : "조회"}
          </Button>
          <label htmlFor="intervalNum" className="text-sm text-slate-600">
            조회 간격
          </label>
          <Select
            id="intervalNum"
            options={INTERVAL_OPTIONS}
            value={intervalNum}
            onChange={handleIntervalChange}
          />
        </div>

        <StatsChart statDataObj={statsData?.statDataObj} />
        <SummaryTables statDataObj={statsData?.statDataObj} />
        <DataTable xAxisList={statsData?.xAxisList ?? []} statDataObj={statsData?.statDataObj} />
      </main>

      <Loader visible={loadingStats} message="조회 중..." />
    </div>
  );
}
