import PropTypes from "prop-types";
import { cn } from "../../utils/cn.js";

/**
 * 필드 하단 에러 메시지. message가 없으면 아무것도 렌더링하지 않는다.
 */
export default function ErrorMessage({ message, className = "" }) {
  if (!message) return null;
  return <p className={cn("mt-1 text-xs text-red-600", className)}>{message}</p>;
}

ErrorMessage.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
};
