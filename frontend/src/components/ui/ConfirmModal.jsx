import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Button from "@/components/ui/Button.jsx";

/**
 * ModalContext가 관리하는 Confirm 모달. 직접 마운트하지 말고 useModal().openConfirm()를 사용한다.
 */
export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    confirmButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-slate-800">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button ref={confirmButtonRef} onClick={onConfirm}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

ConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
