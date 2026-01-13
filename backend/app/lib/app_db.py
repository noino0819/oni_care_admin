"""
파일: app/lib/app_db.py
설명: App DB (oni_care) 커넥션 풀 관리
"""
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from contextlib import asynccontextmanager
from typing import Optional, Any, List, Dict
from app.config.settings import settings


class AppDatabaseManager:
    """
    App PostgreSQL 커넥션 풀 관리자
    oni_care 앱 데이터베이스에 접근하기 위한 별도 커넥션 풀
    """

    def __init__(self):
        self._async_pool: Optional[AsyncConnectionPool] = None

    @property
    def conninfo(self) -> str:
        """커넥션 문자열"""
        return (
            f"host={settings.app_db_host} "
            f"port={settings.app_db_port} "
            f"dbname={settings.app_db_name} "
            f"user={settings.app_db_user} "
            f"password={settings.app_db_password}"
        )

    async def init_async_pool(self) -> None:
        """비동기 커넥션 풀 초기화"""
        self._async_pool = AsyncConnectionPool(
            conninfo=self.conninfo,
            min_size=settings.APP_DB_MIN_CONN,
            max_size=settings.APP_DB_MAX_CONN,
            kwargs={"row_factory": dict_row},
            open=False
        )
        await self._async_pool.open()

    @asynccontextmanager
    async def get_async_conn(self):
        """비동기 커넥션 획득"""
        if not self._async_pool:
            raise RuntimeError("App async pool not initialized")
        async with self._async_pool.connection() as conn:
            yield conn

    async def fetch_one(self, query: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        단일 행 조회
        
        Args:
            query: SQL 쿼리 (Named parameter 사용)
            params: 쿼리 파라미터
            
        Returns:
            조회 결과 딕셔너리 또는 None
        """
        async with self.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or {})
                row = await cur.fetchone()
                return dict(row) if row else None

    async def fetch_all(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        복수 행 조회
        
        Args:
            query: SQL 쿼리 (Named parameter 사용)
            params: 쿼리 파라미터
            
        Returns:
            조회 결과 딕셔너리 리스트
        """
        async with self.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or {})
                rows = await cur.fetchall()
                return [dict(row) for row in rows]

    async def execute(self, query: str, params: Optional[Dict[str, Any]] = None) -> int:
        """
        INSERT/UPDATE/DELETE 실행
        
        Args:
            query: SQL 쿼리 (Named parameter 사용)
            params: 쿼리 파라미터
            
        Returns:
            영향받은 행 수
        """
        async with self.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params or {})
                await conn.commit()
                return cur.rowcount

    async def close(self) -> None:
        """커넥션 풀 종료"""
        if self._async_pool:
            await self._async_pool.close()


# 싱글톤 인스턴스
app_db_manager = AppDatabaseManager()

