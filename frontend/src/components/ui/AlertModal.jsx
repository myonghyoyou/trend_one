import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Button from "./Button.jsx";

/**
 * ModalContext가 관리하는 Alert 모달. 직접 마운트하지 말고 useModal().openAlert()를 사용한다.
 */
export default function AlertModal({ open, message, succYn, onClose }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    confirmButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isFail = succYn === "FAIL";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={`text-sm ${isFail ? "text-red-600" : "text-slate-800"}`}>{message}</p>
        <div className="mt-4 flex justify-end">
          <Button ref={confirmButtonRef} onClick={onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

AlertModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string,
  succYn: PropTypes.oneOf(["SUCCESS", "FAIL"]),
  onClose: PropTypes.func.isRequired,
};
