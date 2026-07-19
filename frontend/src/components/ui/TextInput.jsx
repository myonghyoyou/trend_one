import { forwardRef } from "react";
import PropTypes from "prop-types";
import { cn } from "../../utils/cn.js";

const SIZE_CLASSES = {
  sm: "px-2 py-1.5",
  md: "px-3 py-2",
};

/**
 * 스타일링된 네이티브 input. react-hook-form의 register()를 그대로 스프레드해 사용한다.
 */
const TextInput = forwardRef(function TextInput({ size = "md", type = "text", className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full rounded-md border border-slate-300 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
});

TextInput.propTypes = {
  size: PropTypes.oneOf(["sm", "md"]),
  type: PropTypes.string,
  className: PropTypes.string,
};

export default TextInput;
