# ============================================
# 인증 미들웨어
# ============================================
# JWT 토큰 검증 및 사용자 정보 추출

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.auth_service import AuthService
from app.core.token_store import TokenStore
from app.models.auth import TokenPayload
from app.core.logger import logger


# Bearer 토큰 스키마
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    """
    현재 인증된 사용자 정보 반환
    
    인증이 필수인 엔드포인트에서 사용
    
    Raises:
        HTTPException: 인증 실패 시 401
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "AUTH_ERROR", "message": "인증이 필요합니다."}
        )
    
    token = credentials.credentials
    
    # 블랙리스트 확인
    if await TokenStore.is_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "AUTH_ERROR", "message": "만료된 토큰입니다."}
        )
    
    # 토큰 검증
    payload = AuthService.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "AUTH_ERROR", "message": "유효하지 않은 토큰입니다."}
        )
    
    return payload


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[TokenPayload]:
    """
    현재 사용자 정보 반환 (선택적)
    
    인증이 선택적인 엔드포인트에서 사용
    토큰이 없거나 유효하지 않으면 None 반환
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    
    # 블랙리스트 확인
    if await TokenStore.is_blacklisted(token):
        return None
    
    return AuthService.verify_token(token)


def get_token_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[str]:
    """
    헤더에서 토큰만 추출
    
    로그아웃 등 토큰 자체가 필요한 경우 사용
    """
    if not credentials:
        return None
    return credentials.credentials


