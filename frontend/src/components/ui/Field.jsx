import PropTypes from "prop-types";
import ErrorMessage from "./ErrorMessage.jsx";
import { cn } from "../../utils/cn.js";

const LABEL_CLASSES = {
  sm: "text-xs text-slate-600",
  md: "text-sm text-slate-700",
};

/**
 * label + 컨트롤(children) + 에러 메시지를 묶는 폼 필드 래퍼.
 * 컨트롤(TextInput/Select 등)은 children으로 넘긴다.
 */
export default function Field({ label, htmlFor, error, size = "md", className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={cn("mb-1 block font-medium", LABEL_CLASSES[size])}>
          {label}
        </label>
      )}
      {children}
      <ErrorMessage message={error} />
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string,
  htmlFor: PropTypes.string,
  error: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md"]),
  className: PropTypes.string,
  children: PropTypes.node,
};
