// ============================================
// PostgreSQL 데이터베이스 연결
// ============================================

import { Pool, PoolClient } from 'pg';

// 싱글톤 풀 인스턴스
let pool: Pool | null = null;

// 데이터베이스 연결 풀 가져오기
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 에러 핸들링
    pool.on('error', (err) => {
      // 프로덕션에서는 에러 로깅 서비스로 전송
      if (process.env.NODE_ENV === 'development') {
        console.error('Unexpected error on idle client', err);
      }
    });
  }
  return pool;
}

// 쿼리 실행 헬퍼
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// 단일 결과 조회
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// 트랜잭션 헬퍼
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
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
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

