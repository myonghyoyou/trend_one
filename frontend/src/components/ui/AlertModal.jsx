import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Button from "@/components/ui/Button.jsx";
import { cn } from "@/utils/cn.js";

const TRANSITION_MS = 200;

/**
 * ModalContext가 관리하는 Alert 모달. 직접 마운트하지 말고 useModal().openAlert()를 사용한다.
 */
export default function AlertModal({ open, message, succYn, onClose }) {
  const confirmButtonRef = useRef(null);
  const [mounted, setMounted] = useState(false); // DOM 존재 여부
  const [visible, setVisible] = useState(false); // opacity 1 여부 (fade 트리거)
  const [snapshot, setSnapshot] = useState({ message, succYn });

  // 열릴 때 표시 내용을 스냅샷 → 닫히는 애니메이션 동안 내용(메시지)이 비지 않게 유지
  useEffect(() => {
    if (open) setSnapshot({ message, succYn });
  }, [open, message, succYn]);

  // 마운트 + fade 제어
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true)); // 다음 프레임에 fade-in
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false); // fade-out
    const timer = setTimeout(() => setMounted(false), TRANSITION_MS); // 애니메이션 후 언마운트
    return () => clearTimeout(timer);
  }, [open]);

  // 포커스 + ESC (열려 있을 때만)
  useEffect(() => {
    if (!open) return;
    confirmButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  const isFail = snapshot.succYn === "FAIL";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-sm rounded-lg bg-white p-5 shadow-xl transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <p className={cn("text-center text-sm", isFail ? "text-red-600" : "text-slate-800")}>
          {snapshot.message}
        </p>
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
