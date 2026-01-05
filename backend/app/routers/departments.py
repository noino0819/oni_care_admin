# ============================================
# 부서 API 라우터
# ============================================
# 부서 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/departments", tags=["Departments"])


@router.get("/{department_id}")
async def get_department(
    department_id: int,
    current_user=Depends(get_current_user)
):
    """
    부서 상세 조회
    """
    try:
        department = await query_one(
            "SELECT * FROM public.departments WHERE id = %(department_id)s",
            {"department_id": department_id}
        )
        
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "부서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=department)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"부서 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "부서 조회 중 오류가 발생했습니다."}
        )


@router.put("/{department_id}")
async def update_department(
    department_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    부서 수정
    """
    try:
        department_code = body.get("department_code")
        department_name = body.get("department_name")
        note = body.get("note")
        is_active = body.get("is_active", True)
        
        if not department_code or not department_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "부서코드와 부서명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            UPDATE public.departments
            SET department_code = %(department_code)s,
                department_name = %(department_name)s,
                note = %(note)s,
                is_active = %(is_active)s,
                updated_by = %(updated_by)s,
                updated_at = NOW()
            WHERE id = %(department_id)s
            RETURNING *
            """,
            {
                "department_id": department_id,
                "department_code": department_code,
                "department_name": department_name,
                "note": note,
                "is_active": is_active,
                "updated_by": current_user.name
            }
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "부서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"부서 수정 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "해당 회사에 이미 존재하는 부서코드입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "부서 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{department_id}")
async def delete_department(
    department_id: int,
    current_user=Depends(get_current_user)
):
    """
    부서 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.departments WHERE id = %(department_id)s",
            {"department_id": department_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "부서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"id": department_id})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"부서 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "부서 삭제 중 오류가 발생했습니다."}
        )


