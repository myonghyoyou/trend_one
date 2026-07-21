import { createPortal } from "react-dom";
import PropTypes from "prop-types";

/**
 * 전체 화면 로딩 오버레이. AJAX 호출 전후로 visible을 토글해 사용한다.
 */
export default function Loader({ visible, message, progress }) {
  if (!visible) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/75"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      {message && <p className="text-sm font-medium text-white">{message}</p>}
      {typeof progress === "number" && (
        <div className="w-64" aria-label={`진행률 ${progress}%`}>
          <div className="h-2 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-white">{progress}%</p>
        </div>
      )}
    </div>,
    document.body
  );
}

Loader.propTypes = {
  visible: PropTypes.bool.isRequired,
  message: PropTypes.string,
  progress: PropTypes.number,
};
