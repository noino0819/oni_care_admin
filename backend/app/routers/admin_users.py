# ============================================
# 관리자 회원 API 라우터
# ============================================
# 관리자 회원 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.services.admin_user_service import AdminUserService
from app.models.admin_user import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    ResetPasswordRequest,
)
from app.models.common import ApiResponse, PaginatedResponse
from app.middleware.auth import get_current_user
from app.core.exceptions import AppException
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/admin-users", tags=["Admin Users"])


@router.get("")
async def get_admin_users(
    company_id: Optional[int] = Query(None, description="회사 ID"),
    company_name: Optional[str] = Query(None, description="회사명"),
    department_name: Optional[str] = Query(None, description="부서명"),
    employee_name: Optional[str] = Query(None, description="직원명"),
    login_id: Optional[str] = Query(None, description="사번"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    관리자 회원 목록 조회
    """
    try:
        result = await AdminUserService.get_list(
            company_id=company_id,
            company_name=company_name,
            department_name=department_name,
            employee_name=employee_name,
            login_id=login_id,
            page=page,
            limit=limit
        )
        
        return {
            "success": True,
            "data": result["data"],
            "pagination": result["pagination"]
        }
    except Exception as e:
        logger.error(f"관리자 회원 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "관리자 회원 조회 중 오류가 발생했습니다."}
        )


@router.get("/{user_id}")
async def get_admin_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    """
    관리자 회원 상세 조회
    """
    try:
        user = await AdminUserService.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"관리자 회원 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "관리자 회원 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_admin_user(
    body: AdminUserCreate,
    current_user=Depends(get_current_user)
):
    """
    관리자 회원 등록
    """
    try:
        result = await AdminUserService.create(
            data=body,
            created_by=current_user.name
        )
        
        return ApiResponse(success=True, data=result)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"관리자 회원 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "관리자 회원 등록 중 오류가 발생했습니다."}
        )


@router.put("/{user_id}")
async def update_admin_user(
    user_id: int,
    body: AdminUserUpdate,
    current_user=Depends(get_current_user)
):
    """
    관리자 회원 수정
    """
    try:
        result = await AdminUserService.update(
            user_id=user_id,
            data=body,
            updated_by=current_user.name
        )
        
        return ApiResponse(success=True, data=result)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"관리자 회원 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "관리자 회원 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{user_id}")
async def delete_admin_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    """
    관리자 회원 삭제
    """
    try:
        success = await AdminUserService.delete(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"관리자 회원 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "관리자 회원 삭제 중 오류가 발생했습니다."}
        )


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    body: ResetPasswordRequest = None,
    current_user=Depends(get_current_user)
):
    """
    비밀번호 초기화
    """
    try:
        new_password = body.new_password if body else None
        success = await AdminUserService.reset_password(user_id, new_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "비밀번호가 초기화되었습니다."})
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"비밀번호 초기화 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "RESET_ERROR", "message": "비밀번호 초기화 중 오류가 발생했습니다."}
        )

