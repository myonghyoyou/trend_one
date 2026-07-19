import { forwardRef } from "react";
import PropTypes from "prop-types";

/**
 * 스타일링된 네이티브 select. 옵션 목록 기반 드롭다운(지역, 요일, 간격 선택 등)에 사용한다.
 */
const Select = forwardRef(function Select({ options, placeholder, className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

Select.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
};

export default Select;
