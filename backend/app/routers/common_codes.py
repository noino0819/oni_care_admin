# ============================================
# 공통 코드 API 라우터
# ============================================
# 공통 코드 마스터/상세 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/codes", tags=["Common Codes"])


# ========== 마스터 코드 ==========

@router.get("/masters")
async def get_code_masters(
    code_name: Optional[str] = Query(None, description="코드명"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N)"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    공통 코드 마스터 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if code_name:
            conditions.append("code_name ILIKE %(code_name)s")
            params["code_name"] = f"%{code_name}%"
        
        if is_active == 'Y':
            conditions.append("is_active = true")
        elif is_active == 'N':
            conditions.append("is_active = false")
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.common_code_master {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT id, code_name, description, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.common_code_master
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
        logger.error(f"공통 코드 마스터 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "공통 코드 마스터 조회 중 오류가 발생했습니다."}
        )


@router.get("/masters/{master_id}")
async def get_code_master(
    master_id: int,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 마스터 상세 조회
    """
    try:
        master = await query_one(
            "SELECT * FROM public.common_code_master WHERE id = %(master_id)s",
            {"master_id": master_id}
        )
        
        if not master:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "마스터 코드를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=master)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 마스터 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "공통 코드 마스터 조회 중 오류가 발생했습니다."}
        )


@router.post("/masters")
async def create_code_master(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 마스터 등록
    """
    try:
        code_name = body.get("code_name")
        description = body.get("description")
        is_active = body.get("is_active", True)
        
        if not code_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "코드명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.common_code_master (code_name, description, is_active, created_by)
            VALUES (%(code_name)s, %(description)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "code_name": code_name,
                "description": description,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 마스터 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 코드명입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "공통 코드 마스터 추가 중 오류가 발생했습니다."}
        )


@router.put("/masters/{master_id}")
async def update_code_master(
    master_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 마스터 수정
    """
    try:
        update_fields = []
        params = {"master_id": master_id, "updated_by": current_user.name}
        
        if "code_name" in body:
            update_fields.append("code_name = %(code_name)s")
            params["code_name"] = body["code_name"]
        
        if "description" in body:
            update_fields.append("description = %(description)s")
            params["description"] = body["description"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.common_code_master WHERE id = %(master_id)s",
                {"master_id": master_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.common_code_master
            SET {', '.join(update_fields)}
            WHERE id = %(master_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "마스터 코드를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 마스터 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "공통 코드 마스터 수정 중 오류가 발생했습니다."}
        )


@router.delete("/masters/{master_id}")
async def delete_code_master(
    master_id: int,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 마스터 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.common_code_master WHERE id = %(master_id)s",
            {"master_id": master_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "마스터 코드를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 마스터 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "공통 코드 마스터 삭제 중 오류가 발생했습니다."}
        )


# ========== 상세 코드 ==========

@router.get("/{master_id}")
async def get_codes(
    master_id: int,
    code_name: Optional[str] = Query(None, description="코드명"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N)"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    공통 코드 상세 목록 조회
    """
    try:
        conditions = ["master_id = %(master_id)s"]
        params = {"master_id": master_id}
        
        if code_name:
            conditions.append("code_name ILIKE %(code_name)s")
            params["code_name"] = f"%{code_name}%"
        
        if is_active == 'Y':
            conditions.append("is_active = true")
        elif is_active == 'N':
            conditions.append("is_active = false")
        
        where_clause = f"WHERE {' AND '.join(conditions)}"
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.common_codes {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT id, master_id, code_value, code_name, description, sort_order,
                   extra_field1, extra_field2, extra_field3, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.common_codes
            {where_clause}
            ORDER BY sort_order, id ASC
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
        logger.error(f"공통 코드 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "공통 코드 조회 중 오류가 발생했습니다."}
        )


@router.post("/{master_id}")
async def create_code(
    master_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 상세 등록
    """
    try:
        code_value = body.get("code_value")
        code_name = body.get("code_name")
        description = body.get("description")
        sort_order = body.get("sort_order", 0)
        extra_field1 = body.get("extra_field1")
        extra_field2 = body.get("extra_field2")
        extra_field3 = body.get("extra_field3")
        is_active = body.get("is_active", True)
        
        if not code_value or not code_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "코드값과 코드명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.common_codes 
                (master_id, code_value, code_name, description, sort_order, 
                 extra_field1, extra_field2, extra_field3, is_active, created_by)
            VALUES 
                (%(master_id)s, %(code_value)s, %(code_name)s, %(description)s, %(sort_order)s,
                 %(extra_field1)s, %(extra_field2)s, %(extra_field3)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "master_id": master_id,
                "code_value": code_value,
                "code_name": code_name,
                "description": description,
                "sort_order": sort_order,
                "extra_field1": extra_field1,
                "extra_field2": extra_field2,
                "extra_field3": extra_field3,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 코드값입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "공통 코드 추가 중 오류가 발생했습니다."}
        )


@router.put("/{master_id}/{code_id}")
async def update_code(
    master_id: int,
    code_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 상세 수정
    """
    try:
        update_fields = []
        params = {"master_id": master_id, "code_id": code_id, "updated_by": current_user.name}
        
        for field in ["code_value", "code_name", "description", "sort_order", 
                      "extra_field1", "extra_field2", "extra_field3", "is_active"]:
            if field in body:
                update_fields.append(f"{field} = %({field})s")
                params[field] = body[field]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.common_codes WHERE id = %(code_id)s AND master_id = %(master_id)s",
                {"code_id": code_id, "master_id": master_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.common_codes
            SET {', '.join(update_fields)}
            WHERE id = %(code_id)s AND master_id = %(master_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "코드를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "공통 코드 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{master_id}/{code_id}")
async def delete_code(
    master_id: int,
    code_id: int,
    current_user=Depends(get_current_user)
):
    """
    공통 코드 상세 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.common_codes WHERE id = %(code_id)s AND master_id = %(master_id)s",
            {"code_id": code_id, "master_id": master_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "코드를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공통 코드 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "공통 코드 삭제 중 오류가 발생했습니다."}
        )


