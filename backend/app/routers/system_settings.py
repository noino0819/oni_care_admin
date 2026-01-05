# ============================================
# 시스템 환경설정 API 라우터
# ============================================
# 시스템 설정 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/settings/system", tags=["System Settings"])


@router.get("")
async def get_system_settings(
    setting_key: Optional[str] = Query(None, description="환경변수 키"),
    setting_name: Optional[str] = Query(None, description="환경변수명"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N)"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    시스템 환경설정 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if setting_key:
            conditions.append("setting_key ILIKE %(setting_key)s")
            params["setting_key"] = f"%{setting_key}%"
        
        if setting_name:
            conditions.append("setting_name ILIKE %(setting_name)s")
            params["setting_name"] = f"%{setting_name}%"
        
        if is_active == 'Y':
            conditions.append("is_active = true")
        elif is_active == 'N':
            conditions.append("is_active = false")
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.system_settings {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT id, setting_key, setting_name, setting_value, description,
                   is_active, created_by, created_at, updated_by, updated_at
            FROM public.system_settings
            {where_clause}
            ORDER BY id ASC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params
        )
        
        return {
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"시스템 환경설정 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "환경설정 조회 중 오류가 발생했습니다."}
        )


@router.get("/{setting_id}")
async def get_system_setting(
    setting_id: int,
    current_user=Depends(get_current_user)
):
    """
    시스템 환경설정 상세 조회
    """
    try:
        setting = await query_one(
            "SELECT * FROM public.system_settings WHERE id = %(setting_id)s",
            {"setting_id": setting_id}
        )
        
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "환경설정을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=setting)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시스템 환경설정 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "환경설정 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_system_setting(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    시스템 환경설정 등록
    """
    try:
        setting_key = body.get("setting_key")
        setting_name = body.get("setting_name")
        setting_value = body.get("setting_value")
        description = body.get("description")
        is_active = body.get("is_active", True)
        
        if not setting_key or not setting_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "환경변수키와 환경변수명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.system_settings 
                (setting_key, setting_name, setting_value, description, is_active, created_by)
            VALUES 
                (%(setting_key)s, %(setting_name)s, %(setting_value)s, %(description)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "setting_key": setting_key,
                "setting_name": setting_name,
                "setting_value": setting_value,
                "description": description,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시스템 환경설정 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 환경변수키입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "환경설정 추가 중 오류가 발생했습니다."}
        )


@router.put("/{setting_id}")
async def update_system_setting(
    setting_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    시스템 환경설정 수정
    """
    try:
        update_fields = []
        params = {"setting_id": setting_id, "updated_by": current_user.name}
        
        if "setting_key" in body:
            update_fields.append("setting_key = %(setting_key)s")
            params["setting_key"] = body["setting_key"]
        
        if "setting_name" in body:
            update_fields.append("setting_name = %(setting_name)s")
            params["setting_name"] = body["setting_name"]
        
        if "setting_value" in body:
            update_fields.append("setting_value = %(setting_value)s")
            params["setting_value"] = body["setting_value"]
        
        if "description" in body:
            update_fields.append("description = %(description)s")
            params["description"] = body["description"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.system_settings WHERE id = %(setting_id)s",
                {"setting_id": setting_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.system_settings
            SET {', '.join(update_fields)}
            WHERE id = %(setting_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "환경설정을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시스템 환경설정 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "환경설정 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{setting_id}")
async def delete_system_setting(
    setting_id: int,
    current_user=Depends(get_current_user)
):
    """
    시스템 환경설정 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.system_settings WHERE id = %(setting_id)s",
            {"setting_id": setting_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "환경설정을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"시스템 환경설정 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "환경설정 삭제 중 오류가 발생했습니다."}
        )


