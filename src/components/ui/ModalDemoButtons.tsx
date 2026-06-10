'use client';

// Phase 4 임시 테스트용 — Phase 5 dashboard 구현 시 제거
import { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import Loader from '@/components/ui/Loader';

export default function ModalDemoButtons() {
  const { openAlert, openConfirm } = useModal();
  const [loaderVisible, setLoaderVisible] = useState(false);

  function showLoader() {
    setLoaderVisible(true);
    setTimeout(() => setLoaderVisible(false), 2000);
  }

  return (
    <>
      <Loader visible={loaderVisible} message="로딩 중..." />
      <div className="flex flex-wrap gap-2 p-4 border border-dashed border-gray-300 rounded">
        <span className="w-full text-xs font-medium text-gray-400">
          Phase 4 UI 컴포넌트 테스트 (임시 — Phase 5에서 제거)
        </span>
        <button
          onClick={() => openAlert('알림 모달 테스트입니다.', { title: '알림' })}
          className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
        >
          AlertModal 열기
        </button>
        <button
          onClick={() =>
            openConfirm('이 작업을 진행하시겠습니까?', {
              title: '확인',
              onConfirm: () => openAlert('확인 버튼이 클릭되었습니다.'),
            })
          }
          className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
        >
          ConfirmModal 열기
        </button>
        <button
          onClick={showLoader}
          className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
        >
          Loader (2초)
        </button>
      </div>
    </>
  );
}