# ============================================
# API 마스터 API 라우터
# ============================================
# API 목록 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/apis", tags=["Admin APIs"])


@router.get("")
async def get_apis(
    api_name: Optional[str] = Query(None, description="API명"),
    api_path: Optional[str] = Query(None, description="API 경로"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N/true/false)"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    API 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if api_name:
            conditions.append("api_name ILIKE %(api_name)s")
            params["api_name"] = f"%{api_name}%"
        
        if api_path:
            conditions.append("api_path ILIKE %(api_path)s")
            params["api_path"] = f"%{api_path}%"
        
        if is_active is not None and is_active != '':
            conditions.append("is_active = %(is_active)s")
            params["is_active"] = is_active in ('Y', 'true', 'True', '1')
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.admin_apis {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT id, api_name, api_path, description, is_active, created_at, updated_at
            FROM public.admin_apis
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
        logger.error(f"API 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "API 조회 중 오류가 발생했습니다."}
        )


@router.get("/{api_id}")
async def get_api(
    api_id: int,
    current_user=Depends(get_current_user)
):
    """
    API 상세 조회
    """
    try:
        api = await query_one(
            "SELECT * FROM public.admin_apis WHERE id = %(api_id)s",
            {"api_id": api_id}
        )
        
        if not api:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "API를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=api)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "API 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_api(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    API 등록
    """
    try:
        api_name = body.get("api_name")
        api_path = body.get("api_path")
        description = body.get("description")
        is_active = body.get("is_active", True)
        
        if not api_name or not api_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "API명과 API 경로는 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.admin_apis (api_name, api_path, description, is_active)
            VALUES (%(api_name)s, %(api_path)s, %(description)s, %(is_active)s)
            RETURNING *
            """,
            {
                "api_name": api_name,
                "api_path": api_path,
                "description": description,
                "is_active": is_active
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "API 추가 중 오류가 발생했습니다."}
        )


@router.put("/{api_id}")
async def update_api(
    api_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    API 수정
    """
    try:
        update_fields = []
        params = {"api_id": api_id}
        
        if "api_name" in body:
            update_fields.append("api_name = %(api_name)s")
            params["api_name"] = body["api_name"]
        
        if "api_path" in body:
            update_fields.append("api_path = %(api_path)s")
            params["api_path"] = body["api_path"]
        
        if "description" in body:
            update_fields.append("description = %(description)s")
            params["description"] = body["description"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.admin_apis WHERE id = %(api_id)s",
                {"api_id": api_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.admin_apis
            SET {', '.join(update_fields)}
            WHERE id = %(api_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "API를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "API 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{api_id}")
async def delete_api(
    api_id: int,
    current_user=Depends(get_current_user)
):
    """
    API 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.admin_apis WHERE id = %(api_id)s",
            {"api_id": api_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "API를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "API 삭제 중 오류가 발생했습니다."}
        )


