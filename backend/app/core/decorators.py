# ============================================
# 데코레이터
# ============================================
# 트랜잭션 관리 및 자동 커밋 데코레이터

from functools import wraps
from typing import Callable, Any
from contextlib import asynccontextmanager

from app.config.database import get_connection
from app.core.logger import logger


@asynccontextmanager
async def transaction_context(use_app_db: bool = False):
    """
    트랜잭션 컨텍스트 매니저
    
    사용 예:
        async with transaction_context() as conn:
            await conn.execute(query1)
            await conn.execute(query2)
    """
    async with get_connection(use_app_db) as conn:
        try:
            yield conn
            await conn.commit()
            logger.debug("트랜잭션 커밋 완료")
        except Exception as e:
            await conn.rollback()
            logger.error(f"트랜잭션 롤백: {str(e)}")
            raise


def transactional(use_app_db: bool = False):
    """
    트랜잭션 데코레이터 (원자적 작업용)
    
    전체 함수가 하나의 트랜잭션으로 실행됨
    예외 발생 시 전체 롤백
    
    사용 예:
        @transactional()
        async def create_order(data: dict, conn):
            # conn은 자동으로 주입됨
            await conn.execute(insert_order)
            await conn.execute(insert_order_items)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            async with transaction_context(use_app_db) as conn:
                # conn을 kwargs에 추가
                kwargs['conn'] = conn
                return await func(*args, **kwargs)
        return wrapper
    return decorator


def auto_commit(use_app_db: bool = False):
    """
    자동 커밋 데코레이터 (독립 작업용)
    
    각 쿼리가 개별적으로 커밋됨
    
    사용 예:
        @auto_commit()
        async def log_access(user_id: int, conn):
            await conn.execute(insert_log)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            async with get_connection(use_app_db) as conn:
                conn.autocommit = True
                kwargs['conn'] = conn
                return await func(*args, **kwargs)
        return wrapper
    return decorator

