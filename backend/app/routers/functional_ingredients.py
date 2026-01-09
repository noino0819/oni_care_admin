# ============================================
# 기능성 성분 관리 API 라우터
# ============================================
# 기능성 성분 CRUD 및 기능성 매핑

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.lib.app_db import app_db_manager
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/functional-ingredients", tags=["Functional Ingredients"])


# ============================================
# Pydantic 모델
# ============================================

class FunctionalIngredientCreate(BaseModel):
    """기능성 성분 등록 요청"""
    internal_name: str
    external_name: str
    indicator_component: Optional[str] = None
    daily_intake_min: Optional[float] = None
    daily_intake_max: Optional[float] = None
    daily_intake_unit: Optional[str] = "mg"
    display_functionality: Optional[str] = None
    is_active: bool = True
    priority_display: bool = False


class FunctionalIngredientUpdate(BaseModel):
    """기능성 성분 수정 요청"""
    internal_name: str
    external_name: str
    indicator_component: Optional[str] = None
    daily_intake_min: Optional[float] = None
    daily_intake_max: Optional[float] = None
    daily_intake_unit: Optional[str] = "mg"
    display_functionality: Optional[str] = None
    is_active: bool = True
    priority_display: bool = False


class BatchDeleteRequest(BaseModel):
    """일괄 삭제 요청"""
    ids: List[int]


class SaveFunctionalitiesRequest(BaseModel):
    """기능성 매핑 저장 요청"""
    functionality_ids: List[int]


class DeleteFunctionalitiesRequest(BaseModel):
    """기능성 매핑 삭제 요청"""
    functionality_ids: List[int]


# ============================================
# 기능성 성분 목록/등록/삭제
# ============================================

@router.get("")
async def get_functional_ingredients(
    ingredient_code: Optional[str] = Query(None),
    internal_name: Optional[str] = Query(None),
    external_name: Optional[str] = Query(None),
    indicator_component: Optional[str] = Query(None),
    functionality_content: Optional[str] = Query(None),
    functionality_code: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    """기능성 성분 목록 조회"""
    try:
        offset = (page - 1) * page_size
        conditions = []
        params = []

        if ingredient_code:
            conditions.append("fi.ingredient_code ILIKE %s")
            params.append(f"%{ingredient_code}%")

        if internal_name:
            conditions.append("fi.internal_name ILIKE %s")
            params.append(f"%{internal_name}%")

        if external_name:
            conditions.append("fi.external_name ILIKE %s")
            params.append(f"%{external_name}%")

        if indicator_component:
            conditions.append("fi.indicator_component ILIKE %s")
            params.append(f"%{indicator_component}%")

        if functionality_content:
            conditions.append("""EXISTS (
                SELECT 1 FROM public.ingredient_functionality_mapping ifm
                JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
                WHERE ifm.ingredient_id = fi.id AND fc.content ILIKE %s
            )""")
            params.append(f"%{functionality_content}%")

        if functionality_code:
            conditions.append("""EXISTS (
                SELECT 1 FROM public.ingredient_functionality_mapping ifm
                JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
                WHERE ifm.ingredient_id = fi.id AND fc.functionality_code ILIKE %s
            )""")
            params.append(f"%{functionality_code}%")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 전체 개수
                await cur.execute(
                    f"SELECT COUNT(*) as count FROM public.functional_ingredients fi {where_clause}",
                    params
                )
                count_row = await cur.fetchone()
                total = int(count_row['count']) if count_row else 0

                # 목록 조회
                await cur.execute(
                    f"""SELECT 
                        fi.id, fi.ingredient_code, fi.internal_name, fi.external_name,
                        fi.indicator_component, fi.daily_intake_min, fi.daily_intake_max,
                        fi.daily_intake_unit, fi.display_functionality, fi.is_active,
                        fi.priority_display, fi.created_at
                    FROM public.functional_ingredients fi
                    {where_clause}
                    ORDER BY fi.priority_display DESC, fi.display_order ASC, fi.id ASC
                    LIMIT %s OFFSET %s""",
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
        logger.error(f"기능성 성분 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.get("/{ingredient_id}")
async def get_functional_ingredient(
    ingredient_id: int,
    current_user=Depends(get_current_user)
):
    """기능성 성분 상세 조회"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT 
                        id, ingredient_code, internal_name, external_name,
                        indicator_component, daily_intake_min, daily_intake_max,
                        daily_intake_unit, display_functionality, is_active,
                        priority_display, created_at
                    FROM public.functional_ingredients WHERE id = %s""",
                    [ingredient_id]
                )
                row = await cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "기능성 성분을 찾을 수 없습니다."})

        return {"success": True, "data": row}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기능성 성분 상세 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.post("", status_code=201)
async def create_functional_ingredient(
    body: FunctionalIngredientCreate,
    current_user=Depends(get_current_user)
):
    """기능성 성분 등록"""
    try:
        if not body.internal_name or not body.internal_name.strip():
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "내부 성분명을 입력해주세요."})

        if len(body.internal_name.strip()) > 30:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "내부 성분명은 30자 이내로 입력해주세요."})

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 코드 생성 (시퀀스 사용)
                await cur.execute("SELECT nextval('functional_ingredient_code_seq')")
                seq_row = await cur.fetchone()
                new_code = f"FI{str(seq_row['nextval']).zfill(4)}"

                await cur.execute(
                    """INSERT INTO public.functional_ingredients (
                        ingredient_code, internal_name, external_name, indicator_component,
                        daily_intake_min, daily_intake_max, daily_intake_unit,
                        display_functionality, is_active, priority_display
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id""",
                    [
                        new_code,
                        body.internal_name.strip(),
                        body.external_name.strip() if body.external_name else body.internal_name.strip(),
                        body.indicator_component,
                        body.daily_intake_min,
                        body.daily_intake_max,
                        body.daily_intake_unit or "mg",
                        body.display_functionality,
                        body.is_active,
                        body.priority_display
                    ]
                )
                row = await cur.fetchone()
                await conn.commit()

        return {"success": True, "data": {"id": row['id'], "ingredient_code": new_code}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기능성 성분 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.put("/{ingredient_id}")
async def update_functional_ingredient(
    ingredient_id: int,
    body: FunctionalIngredientUpdate,
    current_user=Depends(get_current_user)
):
    """기능성 성분 수정"""
    try:
        if not body.internal_name or not body.internal_name.strip():
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "내부 성분명을 입력해주세요."})

        if len(body.internal_name.strip()) > 30:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "내부 성분명은 30자 이내로 입력해주세요."})

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """UPDATE public.functional_ingredients SET
                        internal_name = %s,
                        external_name = %s,
                        indicator_component = %s,
                        daily_intake_min = %s,
                        daily_intake_max = %s,
                        daily_intake_unit = %s,
                        display_functionality = %s,
                        is_active = %s,
                        priority_display = %s
                    WHERE id = %s
                    RETURNING id""",
                    [
                        body.internal_name.strip(),
                        body.external_name.strip() if body.external_name else body.internal_name.strip(),
                        body.indicator_component,
                        body.daily_intake_min,
                        body.daily_intake_max,
                        body.daily_intake_unit or "mg",
                        body.display_functionality,
                        body.is_active,
                        body.priority_display,
                        ingredient_id
                    ]
                )
                row = await cur.fetchone()
                await conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "기능성 성분을 찾을 수 없습니다."})

        return {"success": True, "data": {"id": row['id']}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기능성 성분 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.delete("")
async def delete_functional_ingredients(
    body: BatchDeleteRequest,
    current_user=Depends(get_current_user)
):
    """기능성 성분 삭제 (다건)"""
    try:
        if not body.ids:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."})

        placeholders = ", ".join(["%s" for _ in body.ids])
        
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"DELETE FROM public.functional_ingredients WHERE id IN ({placeholders})",
                    body.ids
                )
                await conn.commit()

        return {"success": True, "data": {"deleted": len(body.ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기능성 성분 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


# ============================================
# 기능성 성분 - 기능성 매핑
# ============================================

@router.get("/{ingredient_id}/functionalities")
async def get_ingredient_functionalities(
    ingredient_id: int,
    current_user=Depends(get_current_user)
):
    """기능성 성분에 매핑된 기능성 목록 조회"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT 
                        fc.id as functionality_id,
                        fc.functionality_code,
                        fc.content
                    FROM public.ingredient_functionality_mapping ifm
                    JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
                    WHERE ifm.ingredient_id = %s
                    ORDER BY fc.functionality_code""",
                    [ingredient_id]
                )
                rows = await cur.fetchall()

        return {"success": True, "data": rows}
    except Exception as e:
        logger.error(f"기능성 성분 기능성 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.post("/{ingredient_id}/functionalities")
async def save_ingredient_functionalities(
    ingredient_id: int,
    body: SaveFunctionalitiesRequest,
    current_user=Depends(get_current_user)
):
    """기능성 성분에 기능성 매핑"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 기존 매핑 삭제
                await cur.execute(
                    "DELETE FROM public.ingredient_functionality_mapping WHERE ingredient_id = %s",
                    [ingredient_id]
                )

                # 새 매핑 추가
                for func_id in body.functionality_ids:
                    await cur.execute(
                        """INSERT INTO public.ingredient_functionality_mapping 
                            (ingredient_id, functionality_id)
                        VALUES (%s, %s)""",
                        [ingredient_id, func_id]
                    )

                await conn.commit()

        return {"success": True, "data": {"message": "기능성 매핑이 저장되었습니다."}}
    except Exception as e:
        logger.error(f"기능성 매핑 저장 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.delete("/{ingredient_id}/functionalities")
async def delete_ingredient_functionalities(
    ingredient_id: int,
    body: DeleteFunctionalitiesRequest,
    current_user=Depends(get_current_user)
):
    """기능성 성분에서 기능성 매핑 해제"""
    try:
        if not body.functionality_ids:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."})

        placeholders = ", ".join(["%s" for _ in body.functionality_ids])

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""DELETE FROM public.ingredient_functionality_mapping 
                        WHERE ingredient_id = %s AND functionality_id IN ({placeholders})""",
                    [ingredient_id] + body.functionality_ids
                )
                await conn.commit()

        return {"success": True, "data": {"deleted": len(body.functionality_ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"기능성 매핑 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})

