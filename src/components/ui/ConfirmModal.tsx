'use client';

import { useEffect, useRef } from 'react';
import { useModal } from '@/context/ModalContext';

export default function ConfirmModal() {
  const { confirm: confirmState, closeConfirm } = useModal();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 확인 버튼에 포커스
  useEffect(() => {
    if (confirmState.open) confirmBtnRef.current?.focus();
  }, [confirmState.open]);

  // ESC 키 → 취소와 동일하게 처리
  useEffect(() => {
    if (!confirmState.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmState.open, closeConfirm]);

  if (!confirmState.open) return null;

  function handleConfirm() {
    confirmState.onConfirm?.();
    closeConfirm();
  }

  return (
    // ConfirmModal은 배경 클릭으로 닫히지 않는다 (의도적 선택 강제)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-msg"
        className="w-full max-w-sm bg-white rounded-lg shadow-xl p-6"
      >
        {confirmState.title && (
          <h2 className="text-base font-semibold text-gray-900 mb-2">{confirmState.title}</h2>
        )}
        <p id="confirm-msg" className="text-sm text-gray-700 leading-relaxed">
          {confirmState.message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={closeConfirm}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            취소
          </button>
          <button
            ref={confirmBtnRef}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}