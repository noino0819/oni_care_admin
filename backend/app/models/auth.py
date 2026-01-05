# ============================================
# 인증 관련 모델
# ============================================
# 로그인, 토큰, 사용자 정보 모델

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class LoginRequest(BaseModel):
    """로그인 요청"""
    email: EmailStr = Field(..., description="이메일")
    password: str = Field(..., min_length=1, description="비밀번호")


class TokenResponse(BaseModel):
    """토큰 응답"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # 초 단위


class UserInfo(BaseModel):
    """사용자 정보"""
    id: int
    email: str
    name: str
    role: str
    organization: Optional[str] = None


class LoginResponse(BaseModel):
    """로그인 응답"""
    user: UserInfo
    tokens: TokenResponse


class TokenPayload(BaseModel):
    """JWT 토큰 페이로드"""
    sub: str  # 사용자 ID
    email: str
    name: str
    role: str
    organization: Optional[str] = None
    iat: Optional[int] = None  # 발급 시간
    exp: Optional[int] = None  # 만료 시간


class RefreshTokenRequest(BaseModel):
    """토큰 갱신 요청"""
    refresh_token: str


class RegisterRequest(BaseModel):
    """회원가입 요청"""
    email: EmailStr
    password: str = Field(..., min_length=6, description="비밀번호 (최소 6자)")
    name: str = Field(..., min_length=1, description="이름")


class RegisterResponse(BaseModel):
    """회원가입 응답"""
    id: int
    email: str
    name: str
    created_at: datetime

