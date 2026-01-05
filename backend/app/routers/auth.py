# ============================================
# 인증 API 라우터
# ============================================
# 로그인, 로그아웃, 토큰 갱신, 회원가입

from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.services.auth_service import AuthService
from app.models.auth import (
    LoginRequest,
    LoginResponse,
    TokenResponse,
    RefreshTokenRequest,
)
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user, security, get_token_from_header
from app.core.exceptions import AppException
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(request: Request, body: LoginRequest):
    """
    로그인
    
    이메일과 비밀번호로 로그인하고 토큰을 발급받습니다.
    """
    try:
        # 클라이언트 정보 추출
        ip_address = request.headers.get("x-forwarded-for") or \
                     request.headers.get("x-real-ip") or \
                     request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        result = await AuthService.login(
            email=body.email,
            password=body.password,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return ApiResponse(
            success=True,
            data=LoginResponse(
                user=result["user"],
                tokens=result["tokens"]
            )
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"로그인 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_token(body: RefreshTokenRequest):
    """
    토큰 갱신
    
    리프레시 토큰으로 새로운 액세스 토큰을 발급받습니다.
    """
    try:
        tokens = await AuthService.refresh_access_token(body.refresh_token)
        
        return ApiResponse(
            success=True,
            data=TokenResponse(**tokens)
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"토큰 갱신 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/logout")
async def logout(
    current_user=Depends(get_current_user),
    token: str = Depends(get_token_from_header)
):
    """
    로그아웃
    
    현재 토큰을 무효화합니다.
    """
    try:
        await AuthService.logout(current_user.sub, token)
        return ApiResponse(success=True, data={"message": "로그아웃되었습니다."})
    except Exception as e:
        logger.error(f"로그아웃 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/verify")
async def verify_token(current_user=Depends(get_current_user)):
    """
    토큰 검증
    
    현재 토큰의 유효성을 확인하고 사용자 정보를 반환합니다.
    """
    return ApiResponse(
        success=True,
        data={
            "id": int(current_user.sub),
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role,
            "organization": current_user.organization,
        }
    )


