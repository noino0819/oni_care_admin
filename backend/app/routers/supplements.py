# ============================================
# 영양제 DB 관리 API 라우터
# ============================================
# 영양제 CRUD 및 성분/기능성 매핑

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.lib.app_db import app_db_manager
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/supplements", tags=["Supplements"])


# ============================================
# Pydantic 모델
# ============================================

class SupplementCreate(BaseModel):
    """영양제 등록 요청"""
    product_report_number: Optional[str] = None
    product_name: str
    product_form: Optional[str] = "정"
    dosage: Optional[float] = None
    dosage_unit: Optional[str] = "mg"
    intake_method: Optional[str] = None
    default_intake_time: Optional[str] = "00:00"
    default_intake_amount: Optional[str] = "1"
    default_intake_unit: Optional[str] = "정"
    manufacturer: Optional[str] = None
    is_active: bool = True


class SupplementUpdate(BaseModel):
    """영양제 수정 요청"""
    product_report_number: Optional[str] = None
    product_name: str
    product_form: Optional[str] = "정"
    dosage: Optional[float] = None
    dosage_unit: Optional[str] = "mg"
    intake_method: Optional[str] = None
    default_intake_time: Optional[str] = "00:00"
    default_intake_amount: Optional[str] = "1"
    default_intake_unit: Optional[str] = "정"
    manufacturer: Optional[str] = None
    is_active: bool = True


class BatchDeleteRequest(BaseModel):
    """일괄 삭제 요청"""
    ids: List[str]


class IngredientMapping(BaseModel):
    """성분 매핑 정보"""
    ingredient_id: int
    content_amount: float
    content_unit: str
    display_order: int


class SaveIngredientsRequest(BaseModel):
    """성분 매핑 저장 요청"""
    ingredients: List[IngredientMapping]


class DeleteMappingsRequest(BaseModel):
    """매핑 삭제 요청"""
    mapping_ids: List[int]


# ============================================
# 영양제 목록/등록/삭제
# ============================================

@router.get("")
async def get_supplements(
    product_name: Optional[str] = Query(None),
    report_number: Optional[str] = Query(None),
    ingredient_name: Optional[str] = Query(None),
    functionality: Optional[str] = Query(None),
    default_intake_amount: Optional[str] = Query(None),
    default_intake_time: Optional[str] = Query(None),
    product_form: Optional[str] = Query(None),
    manufacturer: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    """영양제 목록 조회"""
    try:
        offset = (page - 1) * page_size
        conditions = []
        params = []
        param_idx = 1

        if product_name:
            conditions.append(f"s.product_name ILIKE ${param_idx}")
            params.append(f"%{product_name}%")
            param_idx += 1

        if report_number:
            conditions.append(f"s.product_report_number ILIKE ${param_idx}")
            params.append(f"%{report_number}%")
            param_idx += 1

        if ingredient_name:
            conditions.append(f"""EXISTS (
                SELECT 1 FROM public.product_ingredient_mapping pim
                JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
                WHERE pim.product_id = s.id 
                AND (fi.internal_name ILIKE ${param_idx} OR fi.external_name ILIKE ${param_idx})
            )""")
            params.append(f"%{ingredient_name}%")
            param_idx += 1

        if functionality:
            conditions.append(f"""EXISTS (
                SELECT 1 FROM public.product_ingredient_mapping pim
                JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
                JOIN public.ingredient_functionality_mapping ifm ON fi.id = ifm.ingredient_id
                JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
                WHERE pim.product_id = s.id AND fc.content ILIKE ${param_idx}
            )""")
            params.append(f"%{functionality}%")
            param_idx += 1

        if default_intake_amount:
            conditions.append(f"s.default_intake_amount = ${param_idx}")
            params.append(default_intake_amount)
            param_idx += 1

        if default_intake_time:
            conditions.append(f"s.default_intake_time = ${param_idx}")
            params.append(default_intake_time)
            param_idx += 1

        if product_form:
            conditions.append(f"s.form_unit = ${param_idx}")
            params.append(product_form)
            param_idx += 1

        if manufacturer:
            conditions.append(f"s.manufacturer ILIKE ${param_idx}")
            params.append(f"%{manufacturer}%")
            param_idx += 1

        if is_active == 'Y':
            conditions.append("s.is_active = true")
        elif is_active == 'N':
            conditions.append("s.is_active = false")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 전체 개수
                await cur.execute(
                    f"SELECT COUNT(*) as count FROM public.supplement_products_master s {where_clause}",
                    params
                )
                count_row = await cur.fetchone()
                total = int(count_row['count']) if count_row else 0

                # 목록 조회
                await cur.execute(
                    f"""SELECT 
                        s.id, s.product_report_number, s.product_name,
                        s.form_unit as product_form,
                        s.single_dose as dosage, s.dosage_unit,
                        s.intake_method, s.default_intake_time,
                        s.default_intake_amount, s.default_intake_unit,
                        s.manufacturer, s.is_active, s.created_at, s.updated_at
                    FROM public.supplement_products_master s
                    {where_clause}
                    ORDER BY s.updated_at DESC
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
        logger.error(f"영양제 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.get("/{supplement_id}")
async def get_supplement(
    supplement_id: str,
    current_user=Depends(get_current_user)
):
    """영양제 상세 조회"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT 
                        id, product_report_number, product_name,
                        form_unit as product_form,
                        single_dose as dosage, dosage_unit,
                        intake_method, default_intake_time,
                        default_intake_amount, default_intake_unit,
                        manufacturer, image_url, is_active, created_at, updated_at
                    FROM public.supplement_products_master WHERE id = $1""",
                    [supplement_id]
                )
                row = await cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "영양제를 찾을 수 없습니다."})

        return {"success": True, "data": row}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"영양제 상세 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.post("", status_code=201)
async def create_supplement(
    body: SupplementCreate,
    current_user=Depends(get_current_user)
):
    """영양제 등록"""
    try:
        if not body.product_name or not body.product_name.strip():
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "영양제명을 입력해주세요."})

        if len(body.product_name.strip()) > 30:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "영양제명은 30자 이내로 입력해주세요."})

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """INSERT INTO public.supplement_products_master (
                        product_report_number, product_name, form_unit, single_dose, dosage_unit,
                        intake_method, default_intake_time, default_intake_amount, default_intake_unit,
                        manufacturer, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id""",
                    [
                        body.product_report_number,
                        body.product_name.strip(),
                        body.product_form or "정",
                        body.dosage,
                        body.dosage_unit or "mg",
                        body.intake_method,
                        body.default_intake_time or "00:00",
                        body.default_intake_amount or "1",
                        body.default_intake_unit or "정",
                        body.manufacturer,
                        body.is_active
                    ]
                )
                row = await cur.fetchone()
                await conn.commit()

        return {"success": True, "data": {"id": row['id']}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"영양제 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.put("/{supplement_id}")
async def update_supplement(
    supplement_id: str,
    body: SupplementUpdate,
    current_user=Depends(get_current_user)
):
    """영양제 수정"""
    try:
        if not body.product_name or not body.product_name.strip():
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "영양제명을 입력해주세요."})

        if len(body.product_name.strip()) > 30:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "영양제명은 30자 이내로 입력해주세요."})

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """UPDATE public.supplement_products_master SET
                        product_report_number = $1,
                        product_name = $2,
                        form_unit = $3,
                        single_dose = $4,
                        dosage_unit = $5,
                        intake_method = $6,
                        default_intake_time = $7,
                        default_intake_amount = $8,
                        default_intake_unit = $9,
                        manufacturer = $10,
                        is_active = $11,
                        updated_at = NOW()
                    WHERE id = $12
                    RETURNING id""",
                    [
                        body.product_report_number,
                        body.product_name.strip(),
                        body.product_form or "정",
                        body.dosage,
                        body.dosage_unit or "mg",
                        body.intake_method,
                        body.default_intake_time or "00:00",
                        body.default_intake_amount or "1",
                        body.default_intake_unit or "정",
                        body.manufacturer,
                        body.is_active,
                        supplement_id
                    ]
                )
                row = await cur.fetchone()
                await conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "영양제를 찾을 수 없습니다."})

        return {"success": True, "data": {"id": row['id']}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"영양제 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.delete("")
async def delete_supplements(
    body: BatchDeleteRequest,
    current_user=Depends(get_current_user)
):
    """영양제 삭제 (다건)"""
    try:
        if not body.ids:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."})

        placeholders = ", ".join([f"${i+1}" for i in range(len(body.ids))])
        
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"DELETE FROM public.supplement_products_master WHERE id IN ({placeholders})",
                    body.ids
                )
                await conn.commit()

        return {"success": True, "data": {"deleted": len(body.ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"영양제 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


# ============================================
# 영양제 성분 매핑
# ============================================

@router.get("/{supplement_id}/ingredients")
async def get_supplement_ingredients(
    supplement_id: str,
    current_user=Depends(get_current_user)
):
    """영양제 성분 목록 조회"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT 
                        pim.id as mapping_id,
                        pim.ingredient_id,
                        fi.ingredient_code,
                        fi.internal_name,
                        fi.external_name,
                        fi.indicator_component,
                        pim.content_amount,
                        pim.content_unit,
                        pim.display_order
                    FROM public.product_ingredient_mapping pim
                    JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
                    WHERE pim.product_id = $1
                    ORDER BY pim.display_order""",
                    [supplement_id]
                )
                rows = await cur.fetchall()

        return {"success": True, "data": rows}
    except Exception as e:
        logger.error(f"영양제 성분 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.post("/{supplement_id}/ingredients")
async def save_supplement_ingredients(
    supplement_id: str,
    body: SaveIngredientsRequest,
    current_user=Depends(get_current_user)
):
    """영양제 성분 매핑 저장"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                # 기존 매핑 삭제
                await cur.execute(
                    "DELETE FROM public.product_ingredient_mapping WHERE product_id = $1",
                    [supplement_id]
                )

                # 새 매핑 추가
                for ing in body.ingredients:
                    await cur.execute(
                        """INSERT INTO public.product_ingredient_mapping 
                            (product_id, ingredient_id, content_amount, content_unit, display_order)
                        VALUES ($1, $2, $3, $4, $5)""",
                        [supplement_id, ing.ingredient_id, ing.content_amount, ing.content_unit, ing.display_order]
                    )

                await conn.commit()

        return {"success": True, "data": {"message": "성분 매핑이 저장되었습니다."}}
    except Exception as e:
        logger.error(f"영양제 성분 저장 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


@router.delete("/{supplement_id}/ingredients")
async def delete_supplement_ingredients(
    supplement_id: str,
    body: DeleteMappingsRequest,
    current_user=Depends(get_current_user)
):
    """영양제 성분 매핑 삭제"""
    try:
        if not body.mapping_ids:
            raise HTTPException(status_code=400, detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."})

        placeholders = ", ".join([f"${i+1}" for i in range(len(body.mapping_ids))])

        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"DELETE FROM public.product_ingredient_mapping WHERE id IN ({placeholders})",
                    body.mapping_ids
                )
                await conn.commit()

        return {"success": True, "data": {"deleted": len(body.mapping_ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"영양제 성분 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})


# ============================================
# 영양제 기능성 조회
# ============================================

@router.get("/{supplement_id}/functionalities")
async def get_supplement_functionalities(
    supplement_id: str,
    current_user=Depends(get_current_user)
):
    """영양제 기능성 목록 조회 (성분을 통해 연결된 기능성)"""
    try:
        async with app_db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """SELECT DISTINCT
                        fc.id as functionality_id,
                        fc.functionality_code,
                        fc.content,
                        ARRAY_AGG(DISTINCT fi.external_name) FILTER (WHERE fi.external_name IS NOT NULL) as ingredient_names
                    FROM public.product_ingredient_mapping pim
                    JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
                    JOIN public.ingredient_functionality_mapping ifm ON fi.id = ifm.ingredient_id
                    JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
                    WHERE pim.product_id = $1
                    GROUP BY fc.id, fc.functionality_code, fc.content
                    ORDER BY fc.functionality_code""",
                    [supplement_id]
                )
                rows = await cur.fetchall()

        return {"success": True, "data": rows}
    except Exception as e:
        logger.error(f"영양제 기능성 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."})

