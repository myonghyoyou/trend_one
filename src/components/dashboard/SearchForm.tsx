'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { GovernorSearchFormValues } from '@/types';

const SPECIAL_CHAR_RE = /[~!@#$%^&*()_+|<>?:{}]/;

const searchSchema = z
  .object({
    startDate: z.string().min(1, '시작일을 입력하세요.'),
    endDate: z.string().min(1, '종료일을 입력하세요.'),
    srchCity: z.enum(['3100', '1100']),
    inspctDay: z.string(),
    srchCntnt: z
      .string()
      .refine(
        (v) => v === '' || !SPECIAL_CHAR_RE.test(v),
        '검색어에 특수문자를 사용할 수 없습니다.'
      ),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      const diff =
        (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        (1000 * 60 * 60 * 24);
      return diff <= 30;
    },
    { message: '날짜 범위는 최대 30일입니다.', path: ['endDate'] }
  );

function getDefaultDates() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(sevenDaysAgo), endDate: fmt(today) };
}

interface SearchFormProps {
  onSearch: (values: GovernorSearchFormValues) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDates();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GovernorSearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startDate: defaultStart,
      endDate: defaultEnd,
      srchCity: '3100',
      inspctDay: '',
      srchCntnt: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSearch)}
      className="bg-white rounded-lg border border-gray-200 p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        {/* 조회 기간 */}
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-600">조회 기간</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              {...register('startDate')}
              disabled={loading}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="date"
              {...register('endDate')}
              disabled={loading}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          {(errors.startDate || errors.endDate) && (
            <p className="text-xs text-red-500 mt-0.5">
              {errors.startDate?.message ?? errors.endDate?.message}
            </p>
          )}
        </div>

        {/* 지역 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">지역</label>
          <select
            {...register('srchCity')}
            disabled={loading}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="3100">경기</option>
            <option value="1100">서울</option>
          </select>
        </div>

        {/* 점검 요일 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">점검 요일</label>
          <select
            {...register('inspctDay')}
            disabled={loading}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">전체</option>
            <option value="MON">월</option>
            <option value="TUE">화</option>
            <option value="WED">수</option>
            <option value="THU">목</option>
            <option value="FRI">금</option>
          </select>
        </div>

        {/* 정압기명 검색어 */}
        <div className="flex flex-col gap-1 flex-1 min-w-32">
          <label className="text-xs font-medium text-gray-600">정압기명</label>
          <input
            type="text"
            {...register('srchCntnt')}
            placeholder="정압기명 검색"
            disabled={loading}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          {errors.srchCntnt && (
            <p className="text-xs text-red-500 mt-0.5">{errors.srchCntnt.message}</p>
          )}
        </div>

        {/* 검색 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 self-end"
        >
          검색
        </button>
      </div>
    </form>
  );
}