# ============================================
# 식사기록 관리 API
# ============================================
# 사용자들의 식사기록 전체 데이터 조회

from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Query, HTTPException, status
from app.lib.app_db import app_db_manager
from app.core.logger import logger

router = APIRouter(prefix="/admin/meal-records", tags=["식사기록 관리"])


# ============================================
# 식사기록 현황 API
# ============================================

@router.get("")
async def get_meal_records(
    name: Optional[str] = Query(None, description="고객명"),
    user_id: Optional[str] = Query(None, description="고객 ID"),
    member_types: Optional[str] = Query(None, description="회원구분 (콤마 구분: normal,affiliate,fs)"),
    business_code: Optional[str] = Query(None, description="기업/사업장 코드"),
    record_from: Optional[date] = Query(None, description="기록 시작일"),
    record_to: Optional[date] = Query(None, description="기록 종료일"),
    record_source: Optional[str] = Query(None, description="기록구분 (콤마 구분: greating_care,cafeteria)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    식사기록 현황 (회원별 누적 기록 수)
    """
    try:
        conditions = ["1=1"]
        params = {}
        
        if name:
            conditions.append("u.name ILIKE %(name)s")
            params["name"] = f"%{name}%"
        
        if user_id:
            conditions.append("u.id::text ILIKE %(user_id)s OR u.email ILIKE %(user_id)s")
            params["user_id"] = f"%{user_id}%"
        
        if member_types:
            types_list = [t.strip() for t in member_types.split(",") if t.strip()]
            if types_list:
                conditions.append("u.member_type = ANY(%(member_types)s)")
                params["member_types"] = types_list
        
        if business_code:
            conditions.append("u.business_code = %(business_code)s")
            params["business_code"] = business_code
        
        if record_from:
            conditions.append("m.meal_date >= %(record_from)s")
            params["record_from"] = record_from
        
        if record_to:
            conditions.append("m.meal_date <= %(record_to)s")
            params["record_to"] = record_to
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회 (회원 수)
        count_query = f"""
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            JOIN meals m ON u.id = m.user_id
            WHERE {where_clause}
        """
        count_result = await app_db_manager.fetch_one(count_query, params)
        total = count_result["total"] if count_result else 0
        
        # 회원별 누적 기록 수 조회
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                u.id as user_id,
                u.email,
                u.name,
                u.member_type,
                u.business_code,
                COUNT(m.id) as record_count
            FROM users u
            JOIN meals m ON u.id = m.user_id
            WHERE {where_clause}
            GROUP BY u.id, u.email, u.name, u.member_type, u.business_code
            ORDER BY record_count DESC, u.name ASC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        records = await app_db_manager.fetch_all(list_query, params)
        
        return {
            "success": True,
            "data": records,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"식사기록 현황 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="식사기록 현황 조회 중 오류가 발생했습니다."
        )


@router.get("/{user_id}/details")
async def get_meal_record_details(
    user_id: str,
    record_from: Optional[date] = Query(None, description="기록 시작일"),
    record_to: Optional[date] = Query(None, description="기록 종료일"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    특정 회원의 식사기록 세부현황 조회
    """
    try:
        conditions = ["m.user_id = %(user_id)s"]
        params = {"user_id": user_id}
        
        if record_from:
            conditions.append("m.meal_date >= %(record_from)s")
            params["record_from"] = record_from
        
        if record_to:
            conditions.append("m.meal_date <= %(record_to)s")
            params["record_to"] = record_to
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM meals m
            WHERE {where_clause}
        """
        count_result = await app_db_manager.fetch_one(count_query, params)
        total = count_result["total"] if count_result else 0
        
        # 세부 기록 조회 (메뉴 단위)
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                m.id,
                m.meal_type,
                m.food_name as menu_name,
                m.serving_size as portion,
                m.calories,
                m.meal_date,
                m.created_at as record_time,
                m.created_at as updated_at
            FROM meals m
            WHERE {where_clause}
            ORDER BY m.meal_date DESC, m.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        records = await app_db_manager.fetch_all(list_query, params)
        
        # meal_type 한글 변환
        meal_type_map = {
            "breakfast": "아침",
            "lunch": "점심",
            "dinner": "저녁",
            "snack": "간식"
        }
        
        for record in records:
            record["meal_type_display"] = meal_type_map.get(record["meal_type"], record["meal_type"])
            if record["calories"]:
                record["calories_display"] = f"{record['calories']}kcal"
            else:
                record["calories_display"] = "-"
        
        return {
            "success": True,
            "data": records,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"식사기록 세부현황 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="식사기록 세부현황 조회 중 오류가 발생했습니다."
        )

