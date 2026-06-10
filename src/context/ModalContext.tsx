'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AlertState {
  open: boolean;
  message: string;
  title?: string;
}

interface ConfirmState {
  open: boolean;
  message: string;
  title?: string;
  onConfirm?: () => void;
}

interface ModalContextType {
  alert: AlertState;
  confirm: ConfirmState;
  openAlert: (message: string, options?: { title?: string }) => void;
  closeAlert: () => void;
  openConfirm: (
    message: string,
    options?: { title?: string; onConfirm?: () => void }
  ) => void;
  closeConfirm: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal(): ModalContextType {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal은 ModalProvider 내부에서만 사용 가능합니다.');
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '' });
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, message: '' });

  const openAlert = useCallback((message: string, options?: { title?: string }) => {
    setAlert({ open: true, message, title: options?.title });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert({ open: false, message: '' });
  }, []);

  const openConfirm = useCallback(
    (message: string, options?: { title?: string; onConfirm?: () => void }) => {
      setConfirm({
        open: true,
        message,
        title: options?.title,
        onConfirm: options?.onConfirm,
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirm({ open: false, message: '' });
  }, []);

  return (
    <ModalContext.Provider
      value={{ alert, confirm, openAlert, closeAlert, openConfirm, closeConfirm }}
    >
      {children}
    </ModalContext.Provider>
  );
}