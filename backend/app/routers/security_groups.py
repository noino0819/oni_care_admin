# ============================================
# 보안 그룹 API 라우터
# ============================================
# 보안 그룹 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/security-groups", tags=["Security Groups"])


@router.get("")
async def get_security_groups(
    group_name: Optional[str] = Query(None, description="그룹명"),
    group_id: Optional[str] = Query(None, description="그룹 ID"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if group_name:
            conditions.append("group_name ILIKE %(group_name)s")
            params["group_name"] = f"%{group_name}%"
        
        if group_id:
            conditions.append("id::text ILIKE %(group_id)s")
            params["group_id"] = f"%{group_id}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.security_groups {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT id, group_name, description, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.security_groups
            {where_clause}
            ORDER BY created_at DESC
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
        logger.error(f"보안 그룹 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "보안그룹 조회 중 오류가 발생했습니다."}
        )


@router.get("/{group_id}")
async def get_security_group(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 상세 조회
    """
    try:
        group = await query_one(
            "SELECT * FROM public.security_groups WHERE id = %(group_id)s",
            {"group_id": group_id}
        )
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "보안그룹을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=group)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"보안 그룹 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "보안그룹 조회 중 오류가 발생했습니다."}
        )


@router.get("/{group_id}/items")
async def get_security_group_items(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 항목 목록 조회
    """
    try:
        items = await query(
            """
            SELECT id, group_id, entry_path, company_code, company_name, is_active, created_at
            FROM public.security_group_items
            WHERE group_id = %(group_id)s
            ORDER BY company_name
            """,
            {"group_id": group_id}
        )
        
        return {"success": True, "data": items}
    except Exception as e:
        logger.error(f"보안 그룹 항목 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "보안그룹 항목 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_security_group(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 등록
    """
    try:
        group_name = body.get("group_name")
        description = body.get("description")
        is_active = body.get("is_active", True)
        
        if not group_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "보안그룹명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.security_groups (group_name, description, is_active, created_by)
            VALUES (%(group_name)s, %(description)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "group_name": group_name,
                "description": description,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"보안 그룹 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "보안그룹 추가 중 오류가 발생했습니다."}
        )


@router.post("/{group_id}/items")
async def create_security_group_item(
    group_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 항목 등록
    """
    try:
        entry_path = body.get("entry_path")
        company_code = body.get("company_code")
        company_name = body.get("company_name")
        is_active = body.get("is_active", True)
        
        result = await execute_returning(
            """
            INSERT INTO public.security_group_items (group_id, entry_path, company_code, company_name, is_active)
            VALUES (%(group_id)s, %(entry_path)s, %(company_code)s, %(company_name)s, %(is_active)s)
            RETURNING *
            """,
            {
                "group_id": group_id,
                "entry_path": entry_path,
                "company_code": company_code,
                "company_name": company_name,
                "is_active": is_active
            }
        )
        
        return ApiResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"보안 그룹 항목 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "보안그룹 항목 추가 중 오류가 발생했습니다."}
        )


@router.put("/{group_id}")
async def update_security_group(
    group_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 수정
    """
    try:
        update_fields = []
        params = {"group_id": group_id, "updated_by": current_user.name}
        
        if "group_name" in body:
            update_fields.append("group_name = %(group_name)s")
            params["group_name"] = body["group_name"]
        
        if "description" in body:
            update_fields.append("description = %(description)s")
            params["description"] = body["description"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.security_groups WHERE id = %(group_id)s",
                {"group_id": group_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.security_groups
            SET {', '.join(update_fields)}
            WHERE id = %(group_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "보안그룹을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"보안 그룹 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "보안그룹 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{group_id}")
async def delete_security_group(
    group_id: str,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.security_groups WHERE id = %(group_id)s",
            {"group_id": group_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "보안그룹을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"보안 그룹 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "보안그룹 삭제 중 오류가 발생했습니다."}
        )


@router.delete("/{group_id}/items/{item_id}")
async def delete_security_group_item(
    group_id: str,
    item_id: str,
    current_user=Depends(get_current_user)
):
    """
    보안 그룹 항목 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.security_group_items WHERE id = %(item_id)s AND group_id = %(group_id)s",
            {"item_id": item_id, "group_id": group_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "보안그룹 항목을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"보안 그룹 항목 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "보안그룹 항목 삭제 중 오류가 발생했습니다."}
        )

