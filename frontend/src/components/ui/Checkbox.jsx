import { forwardRef } from "react";
import PropTypes from "prop-types";
import { cn } from "../../utils/cn.js";

/**
 * 스타일링된 네이티브 체크박스. brand 색으로 강조한다.
 */
const Checkbox = forwardRef(function Checkbox({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("h-4 w-4 accent-brand-600 disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
});

Checkbox.propTypes = {
  className: PropTypes.string,
};

export default Checkbox;
