"""
파일: app/lib/app_db.py
설명: App DB (oni_care) 커넥션 풀 관리
"""
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from contextlib import asynccontextmanager
from typing import Optional
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

    async def close(self) -> None:
        """커넥션 풀 종료"""
        if self._async_pool:
            await self._async_pool.close()


# 싱글톤 인스턴스
app_db_manager = AppDatabaseManager()

