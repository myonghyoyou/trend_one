import { createPortal } from "react-dom";
import PropTypes from "prop-types";

/**
 * 전체 화면 로딩 오버레이. AJAX 호출 전후로 visible을 토글해 사용한다.
 */
export default function Loader({ visible, message }) {
  if (!visible) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/75"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      {message && <p className="text-sm font-medium text-white">{message}</p>}
    </div>,
    document.body
  );
}

Loader.propTypes = {
  visible: PropTypes.bool.isRequired,
  message: PropTypes.string,
};
