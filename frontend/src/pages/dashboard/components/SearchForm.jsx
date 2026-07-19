import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PropTypes from "prop-types";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import { REGION_OPTIONS, INSPECTION_DAY_OPTIONS, MAX_SEARCH_DATE_RANGE_DAYS } from "../../../constants/domain.js";
import { dateDiffDays, today, daysAgo } from "../../../utils/dateUtil.js";

const SPECIAL_CHAR_PATTERN = /[~!@#$%^&*()_+|<>?:{}]/;

const searchSchema = z
  .object({
    startDate: z.string().min(1, "시작일을 선택하세요."),
    endDate: z.string().min(1, "종료일을 선택하세요."),
    srchCity: z.string(),
    inspctDay: z.string(),
    srchCntnt: z.string().refine((v) => !SPECIAL_CHAR_PATTERN.test(v), "특수문자를 사용할 수 없습니다."),
  })
  .refine((data) => dateDiffDays(data.startDate, data.endDate) <= MAX_SEARCH_DATE_RANGE_DAYS, {
    message: `날짜 범위는 최대 ${MAX_SEARCH_DATE_RANGE_DAYS}일입니다.`,
    path: ["endDate"],
  });

const DEFAULT_VALUES = {
  startDate: daysAgo(7),
  endDate: today(),
  srchCity: "",
  inspctDay: "",
  srchCntnt: "",
};

export default function SearchForm({ onSearch, isSearching }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(searchSchema), defaultValues: DEFAULT_VALUES });

  return (
    <form
      onSubmit={handleSubmit(onSearch)}
      className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div className="col-span-1">
        <label htmlFor="startDate" className="mb-1 block text-xs font-medium text-slate-600">
          시작일
        </label>
        <input
          id="startDate"
          type="date"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          {...register("startDate")}
        />
      </div>

      <div className="col-span-1">
        <label htmlFor="endDate" className="mb-1 block text-xs font-medium text-slate-600">
          종료일
        </label>
        <input
          id="endDate"
          type="date"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          {...register("endDate")}
        />
        {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>}
      </div>

      <div className="col-span-1">
        <label htmlFor="srchCity" className="mb-1 block text-xs font-medium text-slate-600">
          지역
        </label>
        <Select id="srchCity" options={REGION_OPTIONS} placeholder="전체" className="w-full" {...register("srchCity")} />
      </div>

      <div className="col-span-1">
        <label htmlFor="inspctDay" className="mb-1 block text-xs font-medium text-slate-600">
          점검요일
        </label>
        <Select
          id="inspctDay"
          options={INSPECTION_DAY_OPTIONS}
          placeholder="전체"
          className="w-full"
          {...register("inspctDay")}
        />
      </div>

      <div className="col-span-2">
        <label htmlFor="srchCntnt" className="mb-1 block text-xs font-medium text-slate-600">
          정압기명
        </label>
        <input
          id="srchCntnt"
          type="text"
          placeholder="정압기명 검색"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          {...register("srchCntnt")}
        />
        {errors.srchCntnt && <p className="mt-1 text-xs text-red-600">{errors.srchCntnt.message}</p>}
      </div>

      <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-6">
        <Button type="submit" disabled={isSearching} className="w-full sm:w-auto">
          {isSearching ? "검색 중..." : "검색"}
        </Button>
      </div>
    </form>
  );
}

SearchForm.propTypes = {
  onSearch: PropTypes.func.isRequired,
  isSearching: PropTypes.bool,
};
