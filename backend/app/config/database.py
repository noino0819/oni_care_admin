# ============================================
# 데이터베이스 연결 설정
# ============================================
# psycopg3 기반 비동기 커넥션 풀

from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List, AsyncGenerator
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from .settings import settings
from app.core.logger import logger


# 전역 커넥션 풀
db_pool: Optional[AsyncConnectionPool] = None
app_db_pool: Optional[AsyncConnectionPool] = None


async def create_db_pool() -> AsyncConnectionPool:
    """Admin DB 커넥션 풀 생성"""
    global db_pool
    
    if db_pool is None:
        db_pool = AsyncConnectionPool(
            conninfo=settings.admin_db_dsn,
            min_size=settings.DB_MIN_CONN,
            max_size=settings.DB_MAX_CONN,
            kwargs={"row_factory": dict_row},
        )
        await db_pool.open()
        logger.info(f"Admin DB 커넥션 풀 생성 완료 (min={settings.DB_MIN_CONN}, max={settings.DB_MAX_CONN})")
    
    return db_pool


async def create_app_db_pool() -> AsyncConnectionPool:
    """App DB 커넥션 풀 생성"""
    global app_db_pool
    
    if app_db_pool is None:
        app_db_pool = AsyncConnectionPool(
            conninfo=settings.app_db_dsn,
            min_size=settings.APP_DB_MIN_CONN,
            max_size=settings.APP_DB_MAX_CONN,
            kwargs={"row_factory": dict_row},
        )
        await app_db_pool.open()
        logger.info(f"App DB 커넥션 풀 생성 완료 (min={settings.APP_DB_MIN_CONN}, max={settings.APP_DB_MAX_CONN})")
    
    return app_db_pool


async def close_db_pool():
    """모든 DB 커넥션 풀 종료"""
    global db_pool, app_db_pool
    
    if db_pool is not None:
        await db_pool.close()
        db_pool = None
        logger.info("Admin DB 커넥션 풀 종료")
    
    if app_db_pool is not None:
        await app_db_pool.close()
        app_db_pool = None
        logger.info("App DB 커넥션 풀 종료")


@asynccontextmanager
async def get_connection(use_app_db: bool = False) -> AsyncGenerator[psycopg.AsyncConnection, None]:
    """커넥션 풀에서 연결 획득"""
    pool = app_db_pool if use_app_db else db_pool
    
    if pool is None:
        if use_app_db:
            pool = await create_app_db_pool()
        else:
            pool = await create_db_pool()
    
    async with pool.connection() as conn:
        yield conn


async def query(
    sql: str, 
    params: Optional[Dict[str, Any]] = None,
    use_app_db: bool = False
) -> List[Dict[str, Any]]:
    """
    SELECT 쿼리 실행 (복수 결과)
    
    Args:
        sql: SQL 쿼리 (Named Parameter 사용: %(name)s)
        params: 쿼리 파라미터 딕셔너리
        use_app_db: App DB 사용 여부
    
    Returns:
        결과 딕셔너리 리스트
    """
    async with get_connection(use_app_db) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            rows = await cur.fetchall()
            return list(rows) if rows else []


async def query_one(
    sql: str, 
    params: Optional[Dict[str, Any]] = None,
    use_app_db: bool = False
) -> Optional[Dict[str, Any]]:
    """
    SELECT 쿼리 실행 (단일 결과)
    
    Args:
        sql: SQL 쿼리 (Named Parameter 사용: %(name)s)
        params: 쿼리 파라미터 딕셔너리
        use_app_db: App DB 사용 여부
    
    Returns:
        결과 딕셔너리 또는 None
    """
    async with get_connection(use_app_db) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            row = await cur.fetchone()
            return dict(row) if row else None


async def execute(
    sql: str, 
    params: Optional[Dict[str, Any]] = None,
    use_app_db: bool = False
) -> int:
    """
    INSERT/UPDATE/DELETE 쿼리 실행
    
    Args:
        sql: SQL 쿼리 (Named Parameter 사용: %(name)s)
        params: 쿼리 파라미터 딕셔너리
        use_app_db: App DB 사용 여부
    
    Returns:
        영향받은 행 수
    """
    async with get_connection(use_app_db) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            await conn.commit()
            return cur.rowcount


async def execute_returning(
    sql: str, 
    params: Optional[Dict[str, Any]] = None,
    use_app_db: bool = False
) -> Optional[Dict[str, Any]]:
    """
    INSERT/UPDATE 쿼리 실행 후 결과 반환 (RETURNING 사용)
    
    Args:
        sql: SQL 쿼리 (RETURNING 포함, Named Parameter 사용: %(name)s)
        params: 쿼리 파라미터 딕셔너리
        use_app_db: App DB 사용 여부
    
    Returns:
        RETURNING 결과 딕셔너리
    """
    async with get_connection(use_app_db) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or {})
            await conn.commit()
            row = await cur.fetchone()
            return dict(row) if row else None


