# ============================================
# 관리자 회원 모델
# ============================================

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class AdminUserBase(BaseModel):
    """관리자 회원 기본 모델"""
    login_id: Optional[str] = Field(None, description="로그인 ID (사번)")
    employee_name: Optional[str] = Field(None, description="직원명")
    email: Optional[str] = Field(None, description="이메일")
    department_id: Optional[int] = Field(None, description="부서 ID")
    company_id: Optional[int] = Field(None, description="회사 ID")
    phone: Optional[str] = Field(None, description="전화번호")
    is_active: bool = Field(True, description="활성 여부")


class AdminUserCreate(AdminUserBase):
    """관리자 회원 생성 모델"""
    login_id: str = Field(..., description="로그인 ID (사번)")
    employee_name: str = Field(..., description="직원명")
    password: Optional[str] = Field(None, description="비밀번호 (미입력 시 기본값)")


class AdminUserUpdate(BaseModel):
    """관리자 회원 수정 모델"""
    employee_name: Optional[str] = None
    department_id: Optional[int] = None
    company_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class AdminUserResponse(AdminUserBase):
    """관리자 회원 응답 모델"""
    id: int
    name: Optional[str] = None
    role: Optional[str] = None
    department_name: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[int] = None
    last_login: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AdminUserListParams(BaseModel):
    """관리자 회원 목록 조회 파라미터"""
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    department_name: Optional[str] = None
    employee_name: Optional[str] = None
    login_id: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(100, ge=1, le=500)


class ResetPasswordRequest(BaseModel):
    """비밀번호 초기화 요청"""
    new_password: Optional[str] = Field(None, description="새 비밀번호 (미입력 시 기본값)")

