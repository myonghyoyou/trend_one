'use client';

import { useModal } from '@/context/ModalContext';
import type { Governor, GovernorListRequest, GovernorListResponse } from '@/types';

export function useGovernorApi() {
  const { openAlert } = useModal();

  async function searchGovernors(params: GovernorListRequest): Promise<Governor[]> {
    const res = await fetch('/api/governors/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data: GovernorListResponse = await res.json();

    if (data.resCd === '0002') {
      openAlert(data.resMsg ?? '세션이 만료되었습니다.', { title: '세션 만료' });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return [];
    }
    if (data.resCd !== '0000') {
      openAlert(data.resMsg ?? '정압기 검색에 실패하였습니다.', { title: '오류' });
      return [];
    }

    return data.gvrnrList ?? [];
  }

  return { searchGovernors };
}