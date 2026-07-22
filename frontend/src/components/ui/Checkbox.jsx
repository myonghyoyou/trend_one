import { forwardRef } from "react";
import PropTypes from "prop-types";
import { cn } from "@/utils/cn.js";

/**
 * 커스텀 체크박스. 체크 표시가 fade-in/fade-out 되며 체크/해제된다.
 */
const Checkbox = forwardRef(function Checkbox({ className = "", ...props }, ref) {
  return (
    <span className={cn("relative inline-flex h-4 w-4 shrink-0 align-middle", className)}>
      <input
        ref={ref}
        type="checkbox"
        className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white transition-colors duration-100 checked:border-brand-600 checked:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-100"
        {...props}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute inset-0 h-4 w-4 p-0.5 text-white opacity-0 transition-opacity duration-100 peer-checked:opacity-100"
      >
        <path
          d="M3.5 8.5L6.5 11.5L12.5 4.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
});

Checkbox.propTypes = {
  className: PropTypes.string,
};

export default Checkbox;
