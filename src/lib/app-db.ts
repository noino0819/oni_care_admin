// ============================================
// 앱 데이터베이스(oni_care) 연결
// ============================================
// 그리팅 케어 관리 기능을 위한 별도 DB 연결

import { Pool, PoolClient } from 'pg';

// 싱글톤 풀 인스턴스
let appPool: Pool | null = null;

// 앱 데이터베이스 연결 풀 가져오기
export function getAppPool(): Pool {
  if (!appPool) {
    appPool = new Pool({
      host: process.env.APP_DB_HOST || process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.APP_DB_PORT || process.env.DB_PORT || '5432'),
      database: process.env.APP_DB_NAME || 'oni_care',
      user: process.env.APP_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.APP_DB_PASSWORD || process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 에러 핸들링
    appPool.on('error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('App DB: Unexpected error on idle client', err);
      }
    });
  }
  return appPool;
}

// 쿼리 실행 헬퍼
export async function appQuery<T>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getAppPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// 단일 결과 조회
export async function appQueryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await appQuery<T>(text, params);
  return rows[0] || null;
}

// 트랜잭션 헬퍼
export async function withAppTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getAppPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 연결 테스트
export async function testAppConnection(): Promise<boolean> {
  try {
    const pool = getAppPool();
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

