# ============================================
# 로그 API 라우터
# ============================================
# 접속 로그, 개인정보 접근 로그

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/logs", tags=["Logs"])


@router.get("/access")
async def get_access_logs(
    user_id: Optional[str] = Query(None, description="사용자 ID"),
    user_name: Optional[str] = Query(None, description="사용자명"),
    device_type: Optional[str] = Query(None, description="디바이스 타입"),
    login_from: Optional[str] = Query(None, description="로그인 시작일"),
    login_to: Optional[str] = Query(None, description="로그인 종료일"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    접속 로그 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if user_id:
            conditions.append("user_id ILIKE %(user_id)s")
            params["user_id"] = f"%{user_id}%"
        
        if user_name:
            conditions.append("user_name ILIKE %(user_name)s")
            params["user_name"] = f"%{user_name}%"
        
        if device_type:
            conditions.append("device_type ILIKE %(device_type)s")
            params["device_type"] = f"%{device_type}%"
        
        if login_from:
            conditions.append("login_at >= %(login_from)s::timestamp")
            params["login_from"] = login_from
        
        if login_to:
            conditions.append("login_at <= %(login_to)s::timestamp + interval '1 day'")
            params["login_to"] = login_to
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.admin_access_logs {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT id, user_id, user_name, device_type, os, browser,
                   ip_address, login_at, logout_at, created_at
            FROM public.admin_access_logs
            {where_clause}
            ORDER BY login_at DESC
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
        logger.error(f"접속 로그 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "접속로그 조회 중 오류가 발생했습니다."}
        )


@router.get("/personal-info")
async def get_personal_info_logs(
    user_id: Optional[str] = Query(None, description="사용자 ID"),
    user_name: Optional[str] = Query(None, description="사용자명"),
    business_code: Optional[str] = Query(None, description="사업장 코드"),
    survey_id: Optional[str] = Query(None, description="설문 ID"),
    device_type: Optional[str] = Query(None, description="디바이스 타입"),
    login_from: Optional[str] = Query(None, description="로그인 시작일"),
    login_to: Optional[str] = Query(None, description="로그인 종료일"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    개인정보 접근 로그 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if user_id:
            conditions.append("user_id ILIKE %(user_id)s")
            params["user_id"] = f"%{user_id}%"
        
        if user_name:
            conditions.append("user_name ILIKE %(user_name)s")
            params["user_name"] = f"%{user_name}%"
        
        if business_code:
            conditions.append("business_code ILIKE %(business_code)s")
            params["business_code"] = f"%{business_code}%"
        
        if survey_id:
            conditions.append("survey_id ILIKE %(survey_id)s")
            params["survey_id"] = f"%{survey_id}%"
        
        if device_type:
            conditions.append("device_type ILIKE %(device_type)s")
            params["device_type"] = f"%{device_type}%"
        
        if login_from:
            conditions.append("login_at >= %(login_from)s::timestamp")
            params["login_from"] = login_from
        
        if login_to:
            conditions.append("login_at <= %(login_to)s::timestamp + interval '1 day'")
            params["login_to"] = login_to
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.personal_info_access_logs {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT id, user_id, user_name, business_code, survey_id,
                   device_type, os, browser, ip_address, login_at, logout_at, created_at
            FROM public.personal_info_access_logs
            {where_clause}
            ORDER BY login_at DESC
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
        logger.error(f"개인정보 접근 로그 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "개인정보 접근로그 조회 중 오류가 발생했습니다."}
        )


