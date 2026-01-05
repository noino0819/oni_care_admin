# ============================================
# 역할 관리 API 라우터
# ============================================
# 역할 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/roles", tags=["Roles"])


@router.get("")
async def get_roles(
    role_name: Optional[str] = Query(None, description="역할명"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N)"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    역할 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if role_name:
            conditions.append("role_name ILIKE %(role_name)s")
            params["role_name"] = f"%{role_name}%"
        
        if is_active is not None and is_active != '':
            conditions.append("is_active = %(is_active)s")
            params["is_active"] = is_active in ('Y', 'true', 'True')
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.roles {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT id, role_code, role_name, description, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.roles
            {where_clause}
            ORDER BY id ASC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        
        data = await query(data_sql, params)
        
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
        logger.error(f"역할 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "역할 조회 중 오류가 발생했습니다."}
        )


@router.get("/{role_id}")
async def get_role(
    role_id: int,
    current_user=Depends(get_current_user)
):
    """
    역할 상세 조회
    """
    try:
        role = await query_one(
            "SELECT * FROM public.roles WHERE id = %(role_id)s",
            {"role_id": role_id}
        )
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "역할을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=role)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"역할 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "역할 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_role(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    역할 등록
    """
    try:
        role_name = body.get("role_name")
        description = body.get("description")
        is_active = body.get("is_active", True)
        
        if not role_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "역할명은 필수입니다."}
            )
        
        # 역할 코드 자동 생성
        max_code_result = await query_one(
            "SELECT MAX(CAST(role_code AS INTEGER)) as max_code FROM public.roles WHERE role_code ~ '^[0-9]+$'"
        )
        next_code = str(int(max_code_result.get("max_code") or 1000) + 1)
        
        result = await execute_returning(
            """
            INSERT INTO public.roles (role_code, role_name, description, is_active, created_by)
            VALUES (%(role_code)s, %(role_name)s, %(description)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "role_code": next_code,
                "role_name": role_name,
                "description": description,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"역할 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 역할 코드입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "역할 등록 중 오류가 발생했습니다."}
        )


@router.put("/{role_id}")
async def update_role(
    role_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    역할 수정
    """
    try:
        update_fields = []
        params = {"role_id": role_id, "updated_by": current_user.name}
        
        if "role_name" in body:
            update_fields.append("role_name = %(role_name)s")
            params["role_name"] = body["role_name"]
        
        if "description" in body:
            update_fields.append("description = %(description)s")
            params["description"] = body["description"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.roles WHERE id = %(role_id)s",
                {"role_id": role_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.roles
            SET {', '.join(update_fields)}
            WHERE id = %(role_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "역할을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"역할 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "역할 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    current_user=Depends(get_current_user)
):
    """
    역할 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.roles WHERE id = %(role_id)s",
            {"role_id": role_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "역할을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"역할 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "역할 삭제 중 오류가 발생했습니다."}
        )

