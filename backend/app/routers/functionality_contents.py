# ============================================
# 기능성 내용 API 라우터
# ============================================
# 기능성 내용 조회

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.lib.app_db import app_db_manager
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/functionality-contents", tags=["Functionality Contents"])


@router.get("")
async def get_functionality_contents(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    current_user=Depends(get_current_user)
):
    """기능성 내용 목록 조회"""
    try:
        offset = (page - 1) * page_size
        conditions = []
        params = []
        param_idx = 1

        if search:
            conditions.append(f"(fc.content ILIKE ${param_idx} OR fc.functionality_code ILIKE ${param_idx})")
            params.append(f"%{search}%")
            param_idx += 1

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 전체 개수
                await cur.execute(
                    f"SELECT COUNT(*) as count FROM public.functionality_contents fc {where_clause}",
                    params
                )
                count_row = await cur.fetchone()
                total = int(count_row['count']) if count_row else 0

                # 목록 조회
                await cur.execute(
                    f"""SELECT 
                        fc.id, fc.functionality_code, fc.content, fc.created_at
                    FROM public.functionality_contents fc
                    {where_clause}
                    ORDER BY fc.functionality_code ASC
                    LIMIT ${param_idx} OFFSET ${param_idx + 1}""",
                    params + [page_size, offset]
                )
                rows = await cur.fetchall()

        return {
            "success": True,
            "data": rows,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"기능성 내용 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})

