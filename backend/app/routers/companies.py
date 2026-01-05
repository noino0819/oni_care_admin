# ============================================
# 회사 API 라우터
# ============================================
# 회사 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/companies", tags=["Companies"])


@router.get("")
async def get_companies(
    company_code: Optional[str] = Query(None, description="회사코드"),
    company_name: Optional[str] = Query(None, description="회사명"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    회사 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if company_code:
            conditions.append("company_code ILIKE %(company_code)s")
            params["company_code"] = f"%{company_code}%"
        
        if company_name:
            conditions.append("company_name ILIKE %(company_name)s")
            params["company_name"] = f"%{company_name}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.companies {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT id, company_code, company_name, note, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.companies
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
        logger.error(f"회사 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "회사 조회 중 오류가 발생했습니다."}
        )


@router.get("/{company_id}")
async def get_company(
    company_id: int,
    current_user=Depends(get_current_user)
):
    """
    회사 상세 조회
    """
    try:
        company = await query_one(
            "SELECT * FROM public.companies WHERE id = %(company_id)s",
            {"company_id": company_id}
        )
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "회사를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=company)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회사 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "회사 조회 중 오류가 발생했습니다."}
        )


@router.get("/{company_id}/departments")
async def get_company_departments(
    company_id: int,
    current_user=Depends(get_current_user)
):
    """
    회사별 부서 목록 조회
    """
    try:
        departments = await query(
            """
            SELECT id, department_code, department_name, note, is_active,
                   created_by, created_at, updated_by, updated_at
            FROM public.departments
            WHERE company_id = %(company_id)s
            ORDER BY department_name
            """,
            {"company_id": company_id}
        )
        
        return {"success": True, "data": departments}
    except Exception as e:
        logger.error(f"부서 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "부서 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_company(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    회사 등록
    """
    try:
        company_code = body.get("company_code")
        company_name = body.get("company_name")
        note = body.get("note")
        is_active = body.get("is_active", True)
        
        if not company_code or not company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "회사코드와 회사명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.companies (company_code, company_name, note, is_active, created_by)
            VALUES (%(company_code)s, %(company_name)s, %(note)s, %(is_active)s, %(created_by)s)
            RETURNING *
            """,
            {
                "company_code": company_code,
                "company_name": company_name,
                "note": note,
                "is_active": is_active,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회사 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 회사코드입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "회사 등록 중 오류가 발생했습니다."}
        )


@router.put("/{company_id}")
async def update_company(
    company_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    회사 수정
    """
    try:
        update_fields = []
        params = {"company_id": company_id, "updated_by": current_user.name}
        
        if "company_name" in body:
            update_fields.append("company_name = %(company_name)s")
            params["company_name"] = body["company_name"]
        
        if "note" in body:
            update_fields.append("note = %(note)s")
            params["note"] = body["note"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.companies WHERE id = %(company_id)s",
                {"company_id": company_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.companies
            SET {', '.join(update_fields)}
            WHERE id = %(company_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "회사를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회사 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "회사 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    current_user=Depends(get_current_user)
):
    """
    회사 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.companies WHERE id = %(company_id)s",
            {"company_id": company_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "회사를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회사 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "회사 삭제 중 오류가 발생했습니다."}
        )


