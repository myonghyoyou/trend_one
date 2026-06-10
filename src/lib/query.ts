import { QueryResult } from 'pg';
import pool from './db';

type QueryReturnType = 'getOne' | 'getList' | 'execute';

export async function executeQuery(
  sql: string,
  params: unknown[],
  returnType: 'getOne'
): Promise<Record<string, unknown> | undefined>;

export async function executeQuery(
  sql: string,
  params: unknown[],
  returnType: 'getList'
): Promise<Record<string, unknown>[]>;

export async function executeQuery(
  sql: string,
  params: unknown[],
  returnType: 'execute'
): Promise<QueryResult>;

export async function executeQuery(
  sql: string,
  params: unknown[],
  returnType: QueryReturnType
): Promise<Record<string, unknown> | Record<string, unknown>[] | QueryResult | undefined> {
  const result = await pool.query(sql, params);
  switch (returnType) {
    case 'getOne':
      return result.rows[0];
    case 'getList':
      return result.rows;
    case 'execute':
      return result;
  }
}
