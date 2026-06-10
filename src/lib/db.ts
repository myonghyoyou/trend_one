import { Pool } from 'pg';

// pg Pool 싱글톤. Hot reload 환경에서 모듈 재로딩으로 인한 복수 Pool 생성을 방지한다.
declare global {
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}

const pool = global._pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export default pool;
