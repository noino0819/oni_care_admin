# ============================================
# 쿠폰 관리 API
# ============================================
# 쿠폰 발급 내역 데이터 조회
# 챌린지, 전환하기를 통해 사용된 쿠폰 내역 확인

from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Query, HTTPException, status
from app.lib.app_db import app_db_manager
from app.core.logger import logger

router = APIRouter(prefix="/admin/coupons", tags=["쿠폰 관리"])


# ============================================
# 쿠폰 현황 API
# ============================================

@router.get("")
async def get_coupons(
    name: Optional[str] = Query(None, description="고객명"),
    user_id: Optional[str] = Query(None, description="고객 ID"),
    member_types: Optional[str] = Query(None, description="회원구분 (콤마 구분: normal,affiliate,fs)"),
    business_code: Optional[str] = Query(None, description="기업/사업장 코드"),
    issued_from: Optional[date] = Query(None, description="발급 시작일"),
    issued_to: Optional[date] = Query(None, description="발급 종료일"),
    coupon_source: Optional[str] = Query(None, description="발급처 (콤마 구분: greating,cafeteria)"),
    coupon_value: Optional[int] = Query(None, description="쿠폰 금액"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    쿠폰 현황 조회
    """
    try:
        conditions = ["1=1"]
        params = {}
        
        if name:
            conditions.append("u.name ILIKE %(name)s")
            params["name"] = f"%{name}%"
        
        if user_id:
            conditions.append("(u.id::text ILIKE %(user_id)s OR u.email ILIKE %(user_id)s)")
            params["user_id"] = f"%{user_id}%"
        
        if member_types:
            types_list = [t.strip() for t in member_types.split(",") if t.strip()]
            if types_list:
                conditions.append("u.member_type = ANY(%(member_types)s)")
                params["member_types"] = types_list
        
        if business_code:
            conditions.append("u.business_code = %(business_code)s")
            params["business_code"] = business_code
        
        if issued_from:
            conditions.append("c.created_at >= %(issued_from)s")
            params["issued_from"] = issued_from
        
        if issued_to:
            conditions.append("c.created_at < %(issued_to)s::date + interval '1 day'")
            params["issued_to"] = issued_to
        
        if coupon_source:
            sources_list = [s.strip() for s in coupon_source.split(",") if s.strip()]
            if sources_list:
                conditions.append("c.coupon_type = ANY(%(coupon_source)s)")
                params["coupon_source"] = sources_list
        
        if coupon_value:
            conditions.append("c.coupon_value = %(coupon_value)s")
            params["coupon_value"] = coupon_value
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM coupons c
            JOIN users u ON c.user_id = u.id
            WHERE {where_clause}
        """
        count_result = await app_db_manager.fetch_one(count_query, params)
        total = count_result["total"] if count_result else 0
        
        # 쿠폰 현황 조회
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                c.id as coupon_id,
                c.coupon_name,
                c.coupon_value,
                c.coupon_type as coupon_source,
                c.source as source_type,
                c.source_detail,
                c.status,
                c.expires_at,
                c.created_at as issued_at,
                u.id as user_id,
                u.email,
                u.name,
                u.member_type,
                u.business_code
            FROM coupons c
            JOIN users u ON c.user_id = u.id
            WHERE {where_clause}
            ORDER BY c.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        coupons = await app_db_manager.fetch_all(list_query, params)
        
        # 쿠폰 발급처 한글 변환
        source_map = {
            "greating": "그리팅",
            "cafeteria": "카페테리아"
        }
        
        member_type_map = {
            "normal": "일반",
            "affiliate": "제휴사",
            "fs": "FS"
        }
        
        for coupon in coupons:
            coupon["coupon_source_display"] = source_map.get(coupon["coupon_source"], coupon["coupon_source"])
            coupon["member_type_display"] = member_type_map.get(coupon["member_type"], coupon["member_type"])
            if coupon["coupon_value"]:
                coupon["coupon_value_display"] = f"{coupon['coupon_value']:,}원"
            else:
                coupon["coupon_value_display"] = "-"
        
        return {
            "success": True,
            "data": coupons,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"쿠폰 현황 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 현황 조회 중 오류가 발생했습니다."
        )


@router.get("/summary")
async def get_coupon_summary(
    issued_from: Optional[date] = Query(None, description="발급 시작일"),
    issued_to: Optional[date] = Query(None, description="발급 종료일"),
):
    """
    쿠폰 발급 요약 (대시보드용)
    """
    try:
        conditions = ["1=1"]
        params = {}
        
        if issued_from:
            conditions.append("created_at >= %(issued_from)s")
            params["issued_from"] = issued_from
        
        if issued_to:
            conditions.append("created_at < %(issued_to)s::date + interval '1 day'")
            params["issued_to"] = issued_to
        
        where_clause = " AND ".join(conditions)
        
        summary_query = f"""
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
                COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
                SUM(coupon_value) as total_value,
                SUM(CASE WHEN coupon_type = 'greating' THEN coupon_value ELSE 0 END) as greating_value,
                SUM(CASE WHEN coupon_type = 'cafeteria' THEN coupon_value ELSE 0 END) as cafeteria_value
            FROM coupons
            WHERE {where_clause}
        """
        
        summary = await app_db_manager.fetch_one(summary_query, params)
        
        return {
            "success": True,
            "data": {
                "total_count": summary["total_count"] or 0,
                "available_count": summary["available_count"] or 0,
                "used_count": summary["used_count"] or 0,
                "expired_count": summary["expired_count"] or 0,
                "total_value": summary["total_value"] or 0,
                "greating_value": summary["greating_value"] or 0,
                "cafeteria_value": summary["cafeteria_value"] or 0,
            }
        }
    except Exception as e:
        logger.error(f"쿠폰 요약 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 요약 조회 중 오류가 발생했습니다."
        )

