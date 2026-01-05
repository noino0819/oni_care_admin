# ============================================
# Redis 연결 설정
# ============================================
# 토큰 저장 및 캐싱용 Redis 클라이언트

from typing import Optional
import redis.asyncio as redis

from .settings import settings
from app.core.logger import logger


# 전역 Redis 클라이언트
redis_client: Optional[redis.Redis] = None


async def create_redis_client() -> redis.Redis:
    """Redis 클라이언트 생성"""
    global redis_client
    
    if redis_client is None:
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True,
        )
        # 연결 테스트
        await redis_client.ping()
        logger.info(f"Redis 연결 완료 ({settings.REDIS_HOST}:{settings.REDIS_PORT})")
    
    return redis_client


async def close_redis_client():
    """Redis 클라이언트 종료"""
    global redis_client
    
    if redis_client is not None:
        await redis_client.close()
        redis_client = None
        logger.info("Redis 연결 종료")


async def get_redis() -> redis.Redis:
    """Redis 클라이언트 반환"""
    if redis_client is None:
        return await create_redis_client()
    return redis_client

