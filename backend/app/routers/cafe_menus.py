# ============================================
# 카페 메뉴 관리 API 라우터
# ============================================
# 카페 메뉴 조회 (App DB 사용)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/cafe-menus", tags=["CafeMenus"])


@router.get("")
async def get_cafe_menus(
    business_name: Optional[str] = Query(None, description="사업장명"),
    business_code: Optional[str] = Query(None, description="기업/사업장 코드"),
    menu_code: Optional[str] = Query(None, description="메뉴코드"),
    menu_price: Optional[int] = Query(None, description="메뉴 단가"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y,N)"),
    created_from: Optional[str] = Query(None, description="등록일/변경일 시작"),
    created_to: Optional[str] = Query(None, description="등록일/변경일 종료"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    카페 메뉴 목록 조회 (App DB)
    """
    try:
        conditions = []
        params = {}
        
        if business_name:
            conditions.append("business_name ILIKE %(business_name)s")
            params["business_name"] = f"%{business_name}%"
        
        if business_code:
            conditions.append("business_code = %(business_code)s")
            params["business_code"] = business_code
        
        if menu_code:
            conditions.append("menu_code = %(menu_code)s")
            params["menu_code"] = menu_code
        
        if menu_price is not None:
            conditions.append("menu_price = %(menu_price)s")
            params["menu_price"] = menu_price
        
        # 사용여부 필터 (Y, N, Y,N 등)
        if is_active:
            active_values = [v.strip().upper() for v in is_active.split(',')]
            active_conditions = []
            if 'Y' in active_values:
                active_conditions.append("is_active = true")
            if 'N' in active_values:
                active_conditions.append("is_active = false")
            if active_conditions:
                conditions.append(f"({' OR '.join(active_conditions)})")
        
        if created_from:
            conditions.append("(created_at >= %(created_from)s OR updated_at >= %(created_from)s)")
            params["created_from"] = created_from
        
        if created_to:
            conditions.append("(created_at <= %(created_to)s OR updated_at <= %(created_to)s)")
            params["created_to"] = created_to + " 23:59:59"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["business_code", "business_name", "menu_name", "menu_code", "menu_price", "created_at", "updated_at", "is_active"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM cafe_menus {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        # 새로 생성된 메뉴 (3일 이내) 상단 정렬
        menus = await query(
            f"""
            SELECT id, business_code, business_name, menu_name, menu_code, 
                   menu_price, is_active, created_at, updated_at,
                   CASE WHEN created_at >= NOW() - INTERVAL '3 days' THEN true ELSE false END as is_new
            FROM cafe_menus
            {where_clause}
            ORDER BY 
                CASE WHEN created_at >= NOW() - INTERVAL '3 days' THEN 0 ELSE 1 END,
                {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        return {
            "success": True,
            "data": menus,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"카페 메뉴 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{menu_id}")
async def get_cafe_menu(
    menu_id: int,
    current_user=Depends(get_current_user)
):
    """
    카페 메뉴 상세 조회 (App DB)
    """
    try:
        menu = await query_one(
            """
            SELECT id, business_code, business_name, menu_name, menu_code, 
                   menu_price, is_active, created_at, updated_at
            FROM cafe_menus 
            WHERE id = %(menu_id)s
            """,
            {"menu_id": menu_id},
            use_app_db=True
        )
        
        if not menu:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "메뉴를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=menu)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"카페 메뉴 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

