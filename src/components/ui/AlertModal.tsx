'use client';

import { useEffect, useRef } from 'react';
import { useModal } from '@/context/ModalContext';

export default function AlertModal() {
  const { alert, closeAlert } = useModal();
  const btnRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 확인 버튼에 포커스
  useEffect(() => {
    if (alert.open) btnRef.current?.focus();
  }, [alert.open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!alert.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAlert();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [alert.open, closeAlert]);

  if (!alert.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={closeAlert}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-msg"
        className="w-full max-w-sm bg-white rounded-lg shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {alert.title && (
          <h2 className="text-base font-semibold text-gray-900 mb-2">{alert.title}</h2>
        )}
        <p id="alert-msg" className="text-sm text-gray-700 leading-relaxed">
          {alert.message}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            ref={btnRef}
            onClick={closeAlert}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}