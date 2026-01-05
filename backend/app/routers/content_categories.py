# ============================================
# 컨텐츠 카테고리 API 라우터
# ============================================
# 컨텐츠 대분류/중분류 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/content-categories", tags=["Content Categories"])


@router.get("")
async def get_content_categories(
    category_name: Optional[str] = Query(None, description="카테고리명"),
    is_active: Optional[str] = Query(None, description="활성 여부 (Y/N)"),
    parent_id: Optional[int] = Query(None, description="상위 카테고리 ID (null이면 대분류만)"),
    include_children: bool = Query(False, description="하위 카테고리 포함 여부"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(100, ge=1, le=500, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 카테고리 목록 조회 (계층 구조)
    - parent_id가 없으면 대분류만 조회
    - parent_id가 있으면 해당 대분류의 중분류 조회
    """
    try:
        conditions = []
        params = {}
        
        # parent_id 필터
        if parent_id is not None:
            conditions.append("parent_id = %(parent_id)s")
            params["parent_id"] = parent_id
        else:
            conditions.append("parent_id IS NULL")
        
        if category_name:
            conditions.append("category_name ILIKE %(category_name)s")
            params["category_name"] = f"%{category_name}%"
        
        if is_active == 'Y':
            conditions.append("is_active = true")
        elif is_active == 'N':
            conditions.append("is_active = false")
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.content_categories {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 카테고리 목록 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        categories = await query(
            f"""
            SELECT id, COALESCE(category_type, 'interest') as category_type, category_name,
                   parent_id, COALESCE(display_order, 0) as display_order,
                   is_active, created_at
            FROM public.content_categories
            {where_clause}
            ORDER BY display_order, id ASC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params
        )
        
        # 하위 카테고리 포함 옵션
        if include_children and parent_id is None:
            for cat in categories:
                children = await query(
                    """
                    SELECT id, category_type, category_name, parent_id, 
                           COALESCE(display_order, 0) as display_order, is_active, created_at
                    FROM public.content_categories
                    WHERE parent_id = %(parent_id)s
                    ORDER BY display_order, id ASC
                    """,
                    {"parent_id": cat["id"]}
                )
                cat["children"] = children
        
        return {
            "success": True,
            "data": categories,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"컨텐츠 카테고리 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/list")
async def get_categories_simple_list(
    current_user=Depends(get_current_user)
):
    """
    카테고리 간단 목록 (Select용) - 계층 구조
    대분류와 각 대분류에 속한 중분류를 함께 반환
    """
    try:
        # 대분류 조회 (parent_id IS NULL)
        main_categories = await query(
            """
            SELECT id, category_type, category_name, display_order
            FROM public.content_categories
            WHERE is_active = true AND parent_id IS NULL
            ORDER BY display_order, id
            """
        )
        
        # 각 대분류의 중분류 조회
        for cat in main_categories:
            children = await query(
                """
                SELECT id, category_type, category_name, parent_id, display_order
                FROM public.content_categories
                WHERE is_active = true AND parent_id = %(parent_id)s
                ORDER BY display_order, id
                """,
                {"parent_id": cat["id"]}
            )
            cat["children"] = children
        
        return {"success": True, "data": main_categories}
    except Exception as e:
        logger.error(f"카테고리 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/flat")
async def get_categories_flat_list(
    current_user=Depends(get_current_user)
):
    """
    카테고리 플랫 목록 (중분류만, 컨텐츠 등록용)
    """
    try:
        # 중분류만 조회 (parent_id IS NOT NULL)
        categories = await query(
            """
            SELECT c.id, c.category_type, c.category_name, c.parent_id, c.display_order,
                   p.category_name as parent_name
            FROM public.content_categories c
            LEFT JOIN public.content_categories p ON c.parent_id = p.id
            WHERE c.is_active = true AND c.parent_id IS NOT NULL
            ORDER BY p.display_order, c.display_order, c.id
            """
        )
        
        return {"success": True, "data": categories}
    except Exception as e:
        logger.error(f"카테고리 플랫 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{category_id}")
async def get_content_category(
    category_id: int,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 대분류 상세 조회
    """
    try:
        category = await query_one(
            "SELECT * FROM public.content_categories WHERE id = %(category_id)s",
            {"category_id": category_id}
        )
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "카테고리를 찾을 수 없습니다."}
            )
        
        # 중분류 조회
        subcategories = await query(
            """
            SELECT id, subcategory_name, display_order, is_active, created_at, updated_at
            FROM public.content_subcategories
            WHERE category_id = %(category_id)s
            ORDER BY display_order, id
            """,
            {"category_id": category_id}
        )
        
        return ApiResponse(success=True, data={**category, "subcategories": subcategories})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 카테고리 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_content_category(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 카테고리 등록 (대분류/중분류)
    - parent_id가 없으면 대분류
    - parent_id가 있으면 해당 대분류의 중분류
    """
    try:
        category_type = body.get("category_type", "interest")
        category_name = body.get("category_name")
        parent_id = body.get("parent_id")  # 상위 카테고리 ID
        display_order = body.get("display_order", 0)
        is_active = body.get("is_active", True)
        
        if not category_name or not category_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "카테고리 이름을 입력해주세요."}
            )
        
        # parent_id가 있으면 상위 카테고리의 category_type 상속
        if parent_id:
            parent = await query_one(
                "SELECT category_type FROM public.content_categories WHERE id = %(parent_id)s",
                {"parent_id": parent_id}
            )
            if parent:
                category_type = parent.get("category_type", category_type)
        
        result = await execute_returning(
            """
            INSERT INTO public.content_categories (category_type, category_name, parent_id, display_order, is_active)
            VALUES (%(category_type)s, %(category_name)s, %(parent_id)s, %(display_order)s, %(is_active)s)
            RETURNING id
            """,
            {
                "category_type": category_type,
                "category_name": category_name.strip(),
                "parent_id": parent_id,
                "display_order": display_order,
                "is_active": is_active
            }
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 카테고리 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{category_id}")
async def update_content_category(
    category_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 카테고리 수정
    """
    try:
        update_fields = []
        params = {"category_id": category_id}
        
        if "category_type" in body:
            update_fields.append("category_type = %(category_type)s")
            params["category_type"] = body["category_type"]
        
        if "category_name" in body:
            update_fields.append("category_name = %(category_name)s")
            params["category_name"] = body["category_name"]
        
        if "parent_id" in body:
            update_fields.append("parent_id = %(parent_id)s")
            params["parent_id"] = body["parent_id"]
        
        if "display_order" in body:
            update_fields.append("display_order = %(display_order)s")
            params["display_order"] = body["display_order"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.content_categories WHERE id = %(category_id)s",
                {"category_id": category_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.content_categories
            SET {', '.join(update_fields)}
            WHERE id = %(category_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "카테고리를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 카테고리 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{category_id}")
async def delete_content_category(
    category_id: int,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 대분류 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.content_categories WHERE id = %(category_id)s",
            {"category_id": category_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "카테고리를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 카테고리 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


