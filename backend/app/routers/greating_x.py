# ============================================
# 그리팅-X API 라우터
# ============================================
# 그리팅-X 관리자 회원 CRUD

from typing import Optional
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/greating-x", tags=["Greating-X"])


def hash_password_sha256(password: str) -> str:
    """SHA256 비밀번호 해싱"""
    return hashlib.sha256(password.encode()).hexdigest()


# ========== 관리자 회원 ==========

@router.get("/admin-users")
async def get_greating_x_admin_users(
    company_name: Optional[str] = Query(None, description="회사명"),
    department_name: Optional[str] = Query(None, description="부서명"),
    employee_name: Optional[str] = Query(None, description="직원명"),
    login_id: Optional[str] = Query(None, description="사번"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 회원 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if company_name:
            conditions.append("c.company_name ILIKE %(company_name)s")
            params["company_name"] = f"%{company_name}%"
        
        if department_name:
            conditions.append("gxau.department_name ILIKE %(department_name)s")
            params["department_name"] = f"%{department_name}%"
        
        if employee_name:
            conditions.append("gxau.employee_name ILIKE %(employee_name)s")
            params["employee_name"] = f"%{employee_name}%"
        
        if login_id:
            conditions.append("gxau.login_id ILIKE %(login_id)s")
            params["login_id"] = f"%{login_id}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"""
            SELECT COUNT(*) as count
            FROM public.greating_x_admin_users gxau
            LEFT JOIN public.companies c ON gxau.company_id = c.id
            {where_clause}
        """
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT 
                gxau.id, gxau.login_id, gxau.employee_name,
                gxau.department_name,
                gxau.company_id, c.company_name,
                gxau.phone, gxau.is_active, gxau.status,
                gxau.created_by, gxau.created_at, gxau.updated_by, gxau.updated_at
            FROM public.greating_x_admin_users gxau
            LEFT JOIN public.companies c ON gxau.company_id = c.id
            {where_clause}
            ORDER BY gxau.created_at DESC
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
        logger.error(f"그리팅-X 관리자 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "관리자 회원 조회 중 오류가 발생했습니다."}
        )


@router.get("/admin-users/{user_id}")
async def get_greating_x_admin_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 회원 상세 조회
    """
    try:
        user = await query_one(
            """
            SELECT gxau.*, c.company_name
            FROM public.greating_x_admin_users gxau
            LEFT JOIN public.companies c ON gxau.company_id = c.id
            WHERE gxau.id = %(user_id)s
            """,
            {"user_id": user_id}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그리팅-X 관리자 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "관리자 회원 조회 중 오류가 발생했습니다."}
        )


@router.post("/admin-users")
async def create_greating_x_admin_user(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 회원 등록
    """
    try:
        login_id = body.get("login_id")
        password = body.get("password")
        employee_name = body.get("employee_name")
        department_name = body.get("department_name")
        company_id = body.get("company_id")
        phone = body.get("phone")
        is_active = body.get("is_active", True)
        
        if not login_id or not employee_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "사번과 직원명은 필수입니다."}
            )
        
        # 기본 비밀번호 설정
        password_hash = hash_password_sha256(password or f"{login_id}1234")
        
        result = await execute_returning(
            """
            INSERT INTO public.greating_x_admin_users 
                (login_id, password_hash, employee_name, department_name, company_id, phone, is_active, status, created_by)
            VALUES 
                (%(login_id)s, %(password_hash)s, %(employee_name)s, %(department_name)s, %(company_id)s, 
                 %(phone)s, %(is_active)s, %(status)s, %(created_by)s)
            RETURNING id, login_id, employee_name, department_name, company_id, phone, is_active, status, 
                      created_by, created_at, updated_by, updated_at
            """,
            {
                "login_id": login_id,
                "password_hash": password_hash,
                "employee_name": employee_name,
                "department_name": department_name,
                "company_id": company_id,
                "phone": phone,
                "is_active": is_active,
                "status": 1 if is_active else 0,
                "created_by": current_user.name
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그리팅-X 관리자 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 사번입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "관리자 회원 추가 중 오류가 발생했습니다."}
        )


@router.put("/admin-users/{user_id}")
async def update_greating_x_admin_user(
    user_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 회원 수정
    """
    try:
        update_fields = []
        params = {"user_id": user_id, "updated_by": current_user.name}
        
        if "employee_name" in body:
            update_fields.append("employee_name = %(employee_name)s")
            params["employee_name"] = body["employee_name"]
        
        if "department_name" in body:
            update_fields.append("department_name = %(department_name)s")
            params["department_name"] = body["department_name"]
        
        if "company_id" in body:
            update_fields.append("company_id = %(company_id)s")
            params["company_id"] = body["company_id"]
        
        if "phone" in body:
            update_fields.append("phone = %(phone)s")
            params["phone"] = body["phone"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            update_fields.append("status = %(status)s")
            params["is_active"] = body["is_active"]
            params["status"] = 1 if body["is_active"] else 0
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.greating_x_admin_users WHERE id = %(user_id)s",
                {"user_id": user_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.greating_x_admin_users
            SET {', '.join(update_fields)}
            WHERE id = %(user_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그리팅-X 관리자 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "관리자 회원 수정 중 오류가 발생했습니다."}
        )


@router.delete("/admin-users/{user_id}")
async def delete_greating_x_admin_user(
    user_id: int,
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 회원 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.greating_x_admin_users WHERE id = %(user_id)s",
            {"user_id": user_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그리팅-X 관리자 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "관리자 회원 삭제 중 오류가 발생했습니다."}
        )


@router.post("/admin-users/{user_id}/reset-password")
async def reset_greating_x_admin_password(
    user_id: int,
    body: dict = None,
    current_user=Depends(get_current_user)
):
    """
    그리팅-X 관리자 비밀번호 초기화
    """
    try:
        # 사용자 조회
        user = await query_one(
            "SELECT login_id FROM public.greating_x_admin_users WHERE id = %(user_id)s",
            {"user_id": user_id}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "관리자 회원을 찾을 수 없습니다."}
            )
        
        # 기본 비밀번호 설정
        new_password = body.get("new_password") if body else None
        password = new_password or f"{user['login_id']}1234"
        password_hash = hash_password_sha256(password)
        
        await execute(
            """
            UPDATE public.greating_x_admin_users
            SET password_hash = %(password_hash)s, updated_at = NOW()
            WHERE id = %(user_id)s
            """,
            {"user_id": user_id, "password_hash": password_hash}
        )
        
        return ApiResponse(success=True, data={"message": "비밀번호가 초기화되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"그리팅-X 비밀번호 초기화 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "RESET_ERROR", "message": "비밀번호 초기화 중 오류가 발생했습니다."}
        )


