# ============================================
# 컨텐츠 중분류 API 라우터
# ============================================
# 컨텐츠 중분류 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/content-subcategories", tags=["Content Subcategories"])


@router.get("")
async def get_content_subcategories(
    category_id: Optional[int] = Query(None, description="대분류 ID"),
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 중분류 목록 조회
    """
    try:
        params = {}
        where_clause = ""
        
        if category_id:
            where_clause = "WHERE cs.category_id = %(category_id)s"
            params["category_id"] = category_id
        
        subcategories = await query(
            f"""
            SELECT cs.*, cc.category_name
            FROM public.content_subcategories cs
            LEFT JOIN public.content_categories cc ON cs.category_id = cc.id
            {where_clause}
            ORDER BY cs.category_id, cs.display_order, cs.subcategory_name
            """,
            params
        )
        
        return {"success": True, "data": subcategories}
    except Exception as e:
        logger.error(f"중분류 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{subcategory_id}")
async def get_content_subcategory(
    subcategory_id: int,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 중분류 상세 조회
    """
    try:
        subcategory = await query_one(
            """
            SELECT cs.*, cc.category_name
            FROM public.content_subcategories cs
            LEFT JOIN public.content_categories cc ON cs.category_id = cc.id
            WHERE cs.id = %(subcategory_id)s
            """,
            {"subcategory_id": subcategory_id}
        )
        
        if not subcategory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "중분류를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=subcategory)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"중분류 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_content_subcategory(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 중분류 등록
    """
    try:
        category_id = body.get("category_id")
        subcategory_name = body.get("subcategory_name")
        display_order = body.get("display_order", 0)
        is_active = body.get("is_active", True)
        
        if not category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "대분류를 선택해주세요."}
            )
        
        if not subcategory_name or not subcategory_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "중분류 이름을 입력해주세요."}
            )
        
        # 대분류 존재 확인
        category = await query_one(
            "SELECT id FROM public.content_categories WHERE id = %(category_id)s",
            {"category_id": category_id}
        )
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "대분류를 찾을 수 없습니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.content_subcategories (category_id, subcategory_name, display_order, is_active)
            VALUES (%(category_id)s, %(subcategory_name)s, %(display_order)s, %(is_active)s)
            RETURNING id
            """,
            {
                "category_id": category_id,
                "subcategory_name": subcategory_name.strip(),
                "display_order": display_order,
                "is_active": is_active
            }
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"중분류 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{subcategory_id}")
async def update_content_subcategory(
    subcategory_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 중분류 수정
    """
    try:
        update_fields = []
        params = {"subcategory_id": subcategory_id}
        
        if "category_id" in body:
            update_fields.append("category_id = %(category_id)s")
            params["category_id"] = body["category_id"]
        
        if "subcategory_name" in body:
            update_fields.append("subcategory_name = %(subcategory_name)s")
            params["subcategory_name"] = body["subcategory_name"]
        
        if "display_order" in body:
            update_fields.append("display_order = %(display_order)s")
            params["display_order"] = body["display_order"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.content_subcategories WHERE id = %(subcategory_id)s",
                {"subcategory_id": subcategory_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.content_subcategories
            SET {', '.join(update_fields)}
            WHERE id = %(subcategory_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "중분류를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"중분류 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{subcategory_id}")
async def delete_content_subcategory(
    subcategory_id: int,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 중분류 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.content_subcategories WHERE id = %(subcategory_id)s",
            {"subcategory_id": subcategory_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "중분류를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"중분류 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

