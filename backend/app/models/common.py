# ============================================
# 공통 모델
# ============================================
# API 응답 및 페이지네이션 모델

from typing import TypeVar, Generic, Optional, Any, List
from pydantic import BaseModel
from datetime import datetime


T = TypeVar('T')


class PaginationInfo(BaseModel):
    """페이지네이션 정보"""
    page: int
    limit: int
    total: int
    total_pages: int


class ApiResponse(BaseModel, Generic[T]):
    """
    표준 API 응답 모델
    
    성공 시:
        {
            "success": true,
            "data": {...}
        }
    
    실패 시:
        {
            "success": false,
            "error": {
                "code": "AUTH_ERROR",
                "message": "인증에 실패했습니다"
            }
        }
    """
    success: bool
    data: Optional[T] = None
    error: Optional[dict] = None
    pagination: Optional[PaginationInfo] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션된 응답"""
    success: bool = True
    data: List[T]
    pagination: PaginationInfo


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str
    message: str
    timestamp: str
    detail: Optional[Any] = None

