# ============================================
# 커스텀 예외 클래스
# ============================================
# API 응답 표준화를 위한 예외 정의

from typing import Optional, Any
from datetime import datetime


class AppException(Exception):
    """
    애플리케이션 기본 예외 클래스
    모든 커스텀 예외의 부모 클래스
    """
    
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = 500,
        detail: Optional[Any] = None
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.detail = detail
        self.timestamp = datetime.utcnow().isoformat() + "Z"
        super().__init__(message)
    
    def to_dict(self) -> dict:
        """예외를 딕셔너리로 변환"""
        result = {
            "error": self.error_code,
            "message": self.message,
            "timestamp": self.timestamp,
        }
        if self.detail:
            result["detail"] = self.detail
        return result


class ValidationError(AppException):
    """입력값 검증 실패 (400)"""
    
    def __init__(self, message: str = "입력값 검증에 실패했습니다.", detail: Optional[Any] = None):
        super().__init__(
            error_code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            detail=detail
        )


class AuthenticationError(AppException):
    """인증 실패 (401)"""
    
    def __init__(self, message: str = "인증에 실패했습니다."):
        super().__init__(
            error_code="AUTH_ERROR",
            message=message,
            status_code=401
        )


class ForbiddenError(AppException):
    """권한 없음 (403)"""
    
    def __init__(self, message: str = "접근 권한이 없습니다."):
        super().__init__(
            error_code="FORBIDDEN",
            message=message,
            status_code=403
        )


class NotFoundError(AppException):
    """리소스 없음 (404)"""
    
    def __init__(self, message: str = "요청한 리소스를 찾을 수 없습니다."):
        super().__init__(
            error_code="NOT_FOUND",
            message=message,
            status_code=404
        )


class DuplicateKeyError(AppException):
    """중복 키 오류 (409)"""
    
    def __init__(self, message: str = "이미 존재하는 데이터입니다."):
        super().__init__(
            error_code="DUPLICATE_KEY",
            message=message,
            status_code=409
        )


class InternalError(AppException):
    """서버 내부 오류 (500)"""
    
    def __init__(self, message: str = "서버 오류가 발생했습니다."):
        super().__init__(
            error_code="INTERNAL_ERROR",
            message=message,
            status_code=500
        )


