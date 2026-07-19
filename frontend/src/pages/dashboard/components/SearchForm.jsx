import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PropTypes from "prop-types";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Field from "../../../components/ui/Field.jsx";
import TextInput from "../../../components/ui/TextInput.jsx";
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
      <Field label="시작일" htmlFor="startDate" size="sm" className="col-span-1">
        <TextInput id="startDate" type="date" size="sm" {...register("startDate")} />
      </Field>

      <Field label="종료일" htmlFor="endDate" size="sm" className="col-span-1" error={errors.endDate?.message}>
        <TextInput id="endDate" type="date" size="sm" {...register("endDate")} />
      </Field>

      <Field label="지역" htmlFor="srchCity" size="sm" className="col-span-1">
        <Select id="srchCity" options={REGION_OPTIONS} placeholder="전체" className="w-full" {...register("srchCity")} />
      </Field>

      <Field label="점검요일" htmlFor="inspctDay" size="sm" className="col-span-1">
        <Select
          id="inspctDay"
          options={INSPECTION_DAY_OPTIONS}
          placeholder="전체"
          className="w-full"
          {...register("inspctDay")}
        />
      </Field>

      <Field label="정압기명" htmlFor="srchCntnt" size="sm" className="col-span-2" error={errors.srchCntnt?.message}>
        <TextInput id="srchCntnt" type="text" placeholder="정압기명 검색" size="sm" {...register("srchCntnt")} />
      </Field>

      <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-6">
        <Button type="submit" loading={isSearching} className="w-full sm:w-auto">
          검색
        </Button>
      </div>
    </form>
  );
}

SearchForm.propTypes = {
  onSearch: PropTypes.func.isRequired,
  isSearching: PropTypes.bool,
};
