# ============================================
# 토큰 저장소
# ============================================
# Redis 기반 토큰 관리 (블랙리스트, 리프레시 토큰)

from typing import Optional
from datetime import timedelta

from app.config.redis import get_redis
from app.config.settings import settings
from app.core.logger import logger


class TokenStore:
    """Redis 기반 토큰 저장소"""
    
    # Redis 키 프리픽스
    REFRESH_TOKEN_PREFIX = "refresh_token:"
    BLACKLIST_PREFIX = "blacklist:"
    
    @classmethod
    async def store_refresh_token(
        cls, 
        user_id: str, 
        refresh_token: str,
        expires_days: int = None
    ) -> bool:
        """
        리프레시 토큰 저장
        
        Args:
            user_id: 사용자 ID
            refresh_token: 리프레시 토큰
            expires_days: 만료 일수 (기본: 설정값)
        
        Returns:
            저장 성공 여부
        """
        try:
            redis = await get_redis()
            key = f"{cls.REFRESH_TOKEN_PREFIX}{user_id}"
            expires = expires_days or settings.REFRESH_TOKEN_EXPIRE_DAYS
            
            await redis.setex(
                key,
                timedelta(days=expires),
                refresh_token
            )
            logger.debug(f"리프레시 토큰 저장: user_id={user_id}")
            return True
        except Exception as e:
            logger.error(f"리프레시 토큰 저장 실패: {str(e)}")
            return False
    
    @classmethod
    async def get_refresh_token(cls, user_id: str) -> Optional[str]:
        """
        리프레시 토큰 조회
        
        Args:
            user_id: 사용자 ID
        
        Returns:
            저장된 리프레시 토큰 또는 None
        """
        try:
            redis = await get_redis()
            key = f"{cls.REFRESH_TOKEN_PREFIX}{user_id}"
            return await redis.get(key)
        except Exception as e:
            logger.error(f"리프레시 토큰 조회 실패: {str(e)}")
            return None
    
    @classmethod
    async def delete_refresh_token(cls, user_id: str) -> bool:
        """
        리프레시 토큰 삭제 (로그아웃)
        
        Args:
            user_id: 사용자 ID
        
        Returns:
            삭제 성공 여부
        """
        try:
            redis = await get_redis()
            key = f"{cls.REFRESH_TOKEN_PREFIX}{user_id}"
            await redis.delete(key)
            logger.debug(f"리프레시 토큰 삭제: user_id={user_id}")
            return True
        except Exception as e:
            logger.error(f"리프레시 토큰 삭제 실패: {str(e)}")
            return False
    
    @classmethod
    async def add_to_blacklist(
        cls, 
        token: str, 
        expires_minutes: int = None
    ) -> bool:
        """
        토큰을 블랙리스트에 추가
        
        Args:
            token: 무효화할 액세스 토큰
            expires_minutes: 블랙리스트 유지 시간 (기본: 액세스 토큰 만료 시간)
        
        Returns:
            추가 성공 여부
        """
        try:
            redis = await get_redis()
            key = f"{cls.BLACKLIST_PREFIX}{token}"
            expires = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
            
            await redis.setex(
                key,
                timedelta(minutes=expires),
                "1"
            )
            logger.debug("토큰 블랙리스트 추가")
            return True
        except Exception as e:
            logger.error(f"토큰 블랙리스트 추가 실패: {str(e)}")
            return False
    
    @classmethod
    async def is_blacklisted(cls, token: str) -> bool:
        """
        토큰이 블랙리스트에 있는지 확인
        
        Args:
            token: 확인할 액세스 토큰
        
        Returns:
            블랙리스트 포함 여부
        """
        try:
            redis = await get_redis()
            key = f"{cls.BLACKLIST_PREFIX}{token}"
            return await redis.exists(key) > 0
        except Exception as e:
            logger.error(f"블랙리스트 확인 실패: {str(e)}")
            return False

