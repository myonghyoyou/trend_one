'use client';

import type { Governor } from '@/types';

const DAY_LABELS: Record<string, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
};

interface GovernorTableProps {
  governors: Governor[];
  selectedGovernors: Governor[];
  onToggle: (governor: Governor) => void;
  loading: boolean;
  hasSearched: boolean;
}

export default function GovernorTable({
  governors,
  selectedGovernors,
  onToggle,
  loading,
  hasSearched,
}: GovernorTableProps) {
  const selectedUids = new Set(selectedGovernors.map((g) => g.gvrnr_uid));

  if (!hasSearched && !loading) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 테이블 헤더 정보 */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          정압기 목록
          {hasSearched && !loading && (
            <span className="ml-2 text-gray-400 font-normal">({governors.length}건)</span>
          )}
        </span>
        {selectedGovernors.length > 0 && (
          <span className="text-xs text-blue-600">
            {selectedGovernors.length}/3개 선택됨
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="w-10 px-4 py-2.5"></th>
              <th className="px-4 py-2.5">정압기명</th>
              <th className="px-4 py-2.5">지역</th>
              <th className="px-4 py-2.5 text-center">점검 요일</th>
              <th className="px-4 py-2.5 text-right">데이터 건수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              // 로딩 스켈레톤 (3행)
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3.5 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3.5 bg-gray-200 rounded w-12" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-3.5 bg-gray-200 rounded w-6 mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3.5 bg-gray-200 rounded w-10 ml-auto" />
                  </td>
                </tr>
              ))
            ) : governors.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              governors.map((governor) => {
                const isSelected = selectedUids.has(governor.gvrnr_uid);
                return (
                  <tr
                    key={governor.gvrnr_uid}
                    onClick={() => onToggle(governor)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(governor)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        aria-label={`${governor.gvrnr_nm} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {governor.gvrnr_nm}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{governor.cd_name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {DAY_LABELS[governor.inspct_day] ?? governor.inspct_day}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      {governor.gvrnr_stat_cnt.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}