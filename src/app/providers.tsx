'use client';

import { ModalProvider } from '@/context/ModalContext';
import AlertModal from '@/components/ui/AlertModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

// layout.tsx(Server Component)에서 Client 경계를 만드는 래퍼
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      {children}
      <AlertModal />
      <ConfirmModal />
    </ModalProvider>
  );
}