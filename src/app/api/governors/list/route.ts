import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeQuery } from '@/lib/query';
import type { Governor, GovernorListResponse } from '@/types';

const SPECIAL_CHAR_RE = /[~!@#$%^&*()_+|<>?:{}]/;

const listSchema = z
  .object({
    startDate: z
      .string()
      .min(1, '시작일을 입력하세요.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'),
    endDate: z
      .string()
      .min(1, '종료일을 입력하세요.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'),
    srchCity: z.enum(['3100', '1100'], { message: '올바른 지역 코드를 입력하세요.' }),
    inspctDay: z
      .enum(['MON', 'TUE', 'WED', 'THU', 'FRI'], { message: '올바른 점검 요일을 입력하세요.' })
      .optional(),
    srchCntnt: z
      .string()
      .refine((v) => !SPECIAL_CHAR_RE.test(v), '검색어에 특수문자를 사용할 수 없습니다.')
      .optional(),
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

export async function POST(
  request: NextRequest
): Promise<NextResponse<GovernorListResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ resCd: '0001', resMsg: '요청 형식이 올바르지 않습니다.' });
  }

  const parsed = listSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ resCd: '0001', resMsg: firstError.message });
  }

  const { startDate, endDate, srchCity, inspctDay, srchCntnt } = parsed.data;

  // 동적 WHERE 조건 — 사용자 입력은 params[]에만, SQL 문자열에는 $N 인덱스만 삽입
  const params: unknown[] = [startDate, endDate, srchCity];
  const govWhereClauses: string[] = ['b.cate_cd = $3'];

  if (srchCntnt && srchCntnt.trim() !== '') {
    params.push(`%${srchCntnt.trim()}%`);
    govWhereClauses.push(`b.gvrnr_nm LIKE $${params.length}`);
  }
  if (inspctDay) {
    params.push(inspctDay);
    govWhereClauses.push(`b.inspct_day = $${params.length}`);
  }

  const govWhere = govWhereClauses.join(' AND ');

  // AS-IS getGvrnrSrchResult 재현 (파라미터화 쿼리로 재작성)
  // t_governor_stat INNER JOIN → 날짜 범위 내 측정 데이터가 있는 정압기만 반환
  const sql = `
    SELECT
      a.gvrnr_uid,
      COUNT(*)::int AS gvrnr_stat_cnt,
      c.cd_name,
      b.gvrnr_nm,
      b.inspct_day
    FROM (
      SELECT gvrnr_uid
      FROM t_governor_stat
      WHERE DATE_TRUNC('day', record_dttm) >= $1::date
        AND DATE_TRUNC('day', record_dttm) <= $2::date
    ) a
    JOIN t_governor b ON a.gvrnr_uid = b.gvrnr_uid
    JOIN t_region_cd c ON b.cate_cd = c.cate_cd
    WHERE ${govWhere}
    GROUP BY a.gvrnr_uid, b.gvrnr_nm, b.inspct_day, c.cd_name
    ORDER BY b.gvrnr_nm ASC
  `;

  try {
    const rows = (await executeQuery(sql, params, 'getList')) as unknown as Governor[];
    return NextResponse.json({
      resCd: '0000',
      resMsg: '검색이 완료되었습니다.',
      gvrnrList: rows,
    });
  } catch (err) {
    console.error('[/api/governors/list]', err);
    return NextResponse.json({ resCd: '0001', resMsg: '정압기 검색에 실패하였습니다.' });
  }
}