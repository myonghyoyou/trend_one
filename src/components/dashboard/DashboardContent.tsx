'use client';

import { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import { useGovernorApi } from '@/hooks/useGovernorApi';
import Loader from '@/components/ui/Loader';
import SearchForm from '@/components/dashboard/SearchForm';
import GovernorTable from '@/components/dashboard/GovernorTable';
import type { Governor, GovernorSearchFormValues } from '@/types';

export default function DashboardContent() {
  const [governors, setGovernors] = useState<Governor[]>([]);
  const [selectedGovernors, setSelectedGovernors] = useState<Governor[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { openAlert } = useModal();
  const { searchGovernors } = useGovernorApi();

  async function handleSearch(values: GovernorSearchFormValues) {
    setLoading(true);
    setSelectedGovernors([]);

    const params = {
      startDate: values.startDate,
      endDate: values.endDate,
      srchCity: values.srchCity,
      ...(values.inspctDay ? { inspctDay: values.inspctDay } : {}),
      ...(values.srchCntnt.trim() ? { srchCntnt: values.srchCntnt.trim() } : {}),
    };

    try {
      const result = await searchGovernors(params);
      setGovernors(result);
      setHasSearched(true);
    } catch {
      openAlert('서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.', { title: '오류' });
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(governor: Governor) {
    const isSelected = selectedGovernors.some(
      (g) => g.gvrnr_uid === governor.gvrnr_uid
    );
    if (isSelected) {
      setSelectedGovernors((prev) =>
        prev.filter((g) => g.gvrnr_uid !== governor.gvrnr_uid)
      );
    } else {
      if (selectedGovernors.length >= 3) {
        openAlert('최대 3개까지 선택할 수 있습니다.', { title: '선택 제한' });
        return;
      }
      setSelectedGovernors((prev) => [...prev, governor]);
    }
  }

  return (
    <>
      <Loader visible={loading} message="정압기 목록 조회 중..." />
      <div className="flex flex-col gap-4 p-4">
        <SearchForm onSearch={handleSearch} loading={loading} />
        <GovernorTable
          governors={governors}
          selectedGovernors={selectedGovernors}
          onToggle={handleToggle}
          loading={loading}
          hasSearched={hasSearched}
        />
        {selectedGovernors.length > 0 && !loading && (
          <p className="text-xs text-gray-400 text-center py-2">
            다음 단계에서 통계 조회 영역 구현 예정
          </p>
        )}
      </div>
    </>
  );
}