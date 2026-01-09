# ============================================
# 단위 마스터 API 라우터
# ============================================
# 단위 조회

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config.database import get_connection
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/units", tags=["Units"])


@router.get("")
async def get_units(
    category: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    """단위 목록 조회"""
    try:
        conditions = []
        params = []
        param_idx = 1

        if category:
            conditions.append(f"category = ${param_idx}")
            params.append(category)
            param_idx += 1

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""SELECT 
                        id, category, unit_name, display_order, is_active
                    FROM public.unit_master
                    {where_clause}
                    ORDER BY category, display_order ASC""",
                    params
                )
                rows = await cur.fetchall()

        # 카테고리별 그룹핑
        grouped = {}
        for row in rows:
            cat = row['category']
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(row)

        return {
            "success": True,
            "data": rows,
            "grouped": grouped
        }
    except Exception as e:
        logger.error(f"단위 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})

