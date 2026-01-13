# ============================================
# 영양제 코너 관리 API
# ============================================
# 프론트 영양제 추천 화면 코너 및 영양제 관리

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field
from app.lib.app_db import app_db_manager
from app.core.logger import logger

router = APIRouter(prefix="/api/v1/admin/supplement-corners", tags=["영양제 코너 관리"])


# ============================================
# Pydantic 모델
# ============================================

class CornerCreate(BaseModel):
    """코너 생성 모델"""
    corner_name: str = Field(..., max_length=30, description="코너명 (30자 이내)")
    description: Optional[str] = Field(None, max_length=50, description="설명 (50자 이내)")
    display_order: int = Field(default=999, description="노출 우선순위")
    is_active: bool = Field(default=True, description="노출여부")


class CornerUpdate(BaseModel):
    """코너 수정 모델"""
    corner_name: Optional[str] = Field(None, max_length=30)
    description: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class ProductMapping(BaseModel):
    """영양제 매핑 모델"""
    product_id: str
    display_order: int = 999


class ProductMappingBulk(BaseModel):
    """영양제 일괄 매핑 모델"""
    products: List[ProductMapping]


# ============================================
# 코너 CRUD API
# ============================================

@router.get("")
async def get_corners(
    corner_name: Optional[str] = Query(None, description="코너명 검색"),
    is_for_sale: Optional[str] = Query(None, description="판매여부 (Y/N)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    코너 목록 조회
    """
    try:
        conditions = ["1=1"]
        params = {}
        
        if corner_name:
            conditions.append("sc.corner_name ILIKE %(corner_name)s")
            params["corner_name"] = f"%{corner_name}%"
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM supplement_corners sc
            WHERE {where_clause}
        """
        count_result = await app_db_manager.fetch_one(count_query, params)
        total = count_result["total"] if count_result else 0
        
        # 목록 조회
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                sc.id,
                sc.corner_name,
                sc.description,
                sc.display_order,
                sc.is_active,
                sc.created_at,
                sc.updated_at,
                (SELECT COUNT(*) FROM supplement_corner_products scp 
                 WHERE scp.corner_id = sc.id AND scp.is_active = true) as product_count
            FROM supplement_corners sc
            WHERE {where_clause}
            ORDER BY sc.display_order ASC, sc.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        corners = await app_db_manager.fetch_all(list_query, params)
        
        return {
            "success": True,
            "data": corners,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"코너 목록 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코너 목록 조회 중 오류가 발생했습니다."
        )


@router.get("/{corner_id}")
async def get_corner(corner_id: int):
    """
    코너 상세 조회
    """
    try:
        query = """
            SELECT 
                id, corner_name, description, display_order, 
                is_active, created_at, updated_at
            FROM supplement_corners
            WHERE id = %(corner_id)s
        """
        corner = await app_db_manager.fetch_one(query, {"corner_id": corner_id})
        
        if not corner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="코너를 찾을 수 없습니다."
            )
        
        return {"success": True, "data": corner}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 상세 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코너 조회 중 오류가 발생했습니다."
        )


@router.post("")
async def create_corner(data: CornerCreate):
    """
    코너 등록
    """
    try:
        # 순위 중복 확인
        check_query = """
            SELECT id FROM supplement_corners 
            WHERE display_order = %(display_order)s AND display_order != 999
        """
        existing = await app_db_manager.fetch_one(check_query, {"display_order": data.display_order})
        
        if existing and data.display_order != 999:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 순위입니다. 다시 확인해주세요."
            )
        
        # 코너 생성
        insert_query = """
            INSERT INTO supplement_corners (corner_name, description, display_order, is_active)
            VALUES (%(corner_name)s, %(description)s, %(display_order)s, %(is_active)s)
            RETURNING id
        """
        result = await app_db_manager.fetch_one(insert_query, data.model_dump())
        
        return {"success": True, "data": {"id": result["id"]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 등록 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코너 등록 중 오류가 발생했습니다."
        )


@router.put("/{corner_id}")
async def update_corner(corner_id: int, data: CornerUpdate):
    """
    코너 수정
    """
    try:
        # 순위 중복 확인 (자기 자신 제외)
        if data.display_order is not None and data.display_order != 999:
            check_query = """
                SELECT id FROM supplement_corners 
                WHERE display_order = %(display_order)s AND id != %(corner_id)s
            """
            existing = await app_db_manager.fetch_one(check_query, {
                "display_order": data.display_order,
                "corner_id": corner_id
            })
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 존재하는 순위입니다. 다시 확인해주세요."
                )
        
        # 업데이트할 필드만 추출
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_data:
            return {"success": True, "data": {"id": corner_id}}
        
        set_clause = ", ".join([f"{k} = %({k})s" for k in update_data.keys()])
        update_data["corner_id"] = corner_id
        
        update_query = f"""
            UPDATE supplement_corners
            SET {set_clause}, updated_at = NOW()
            WHERE id = %(corner_id)s
            RETURNING id
        """
        result = await app_db_manager.fetch_one(update_query, update_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="코너를 찾을 수 없습니다."
            )
        
        return {"success": True, "data": {"id": corner_id}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 수정 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코너 수정 중 오류가 발생했습니다."
        )


@router.delete("")
async def delete_corners(ids: List[int] = Query(..., description="삭제할 코너 ID 목록")):
    """
    코너 삭제 (복수)
    """
    try:
        if not ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 코너 ID를 지정해주세요."
            )
        
        delete_query = """
            DELETE FROM supplement_corners WHERE id = ANY(%(ids)s)
        """
        await app_db_manager.execute(delete_query, {"ids": ids})
        
        return {"success": True, "data": {"deleted_count": len(ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 삭제 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코너 삭제 중 오류가 발생했습니다."
        )


# ============================================
# 코너별 영양제 매핑 API
# ============================================

@router.get("/{corner_id}/products")
async def get_corner_products(
    corner_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    코너별 영양제 목록 조회
    """
    try:
        # 총 건수 조회
        count_query = """
            SELECT COUNT(*) as total
            FROM supplement_corner_products scp
            JOIN supplement_products_master spm ON scp.product_id = spm.id
            WHERE scp.corner_id = %(corner_id)s
        """
        count_result = await app_db_manager.fetch_one(count_query, {"corner_id": corner_id})
        total = count_result["total"] if count_result else 0
        
        # 목록 조회
        offset = (page - 1) * page_size
        list_query = """
            SELECT 
                scp.id as mapping_id,
                spm.id as product_id,
                spm.product_name,
                spm.manufacturer as brand_name,
                spm.is_active as is_for_sale,
                scp.display_order,
                (
                    SELECT ARRAY_AGG(DISTINCT cc.category_name)
                    FROM product_ingredient_mapping pim
                    JOIN functional_ingredients fi ON pim.ingredient_id = fi.id
                    JOIN interest_ingredients ii ON fi.external_name = ii.ingredient_name
                    JOIN content_categories cc ON ii.interest_name = cc.category_name
                    WHERE pim.product_id = spm.id
                ) as interest_tags
            FROM supplement_corner_products scp
            JOIN supplement_products_master spm ON scp.product_id = spm.id
            WHERE scp.corner_id = %(corner_id)s
            ORDER BY scp.display_order ASC, spm.product_name ASC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        products = await app_db_manager.fetch_all(list_query, {
            "corner_id": corner_id,
            "limit": page_size,
            "offset": offset
        })
        
        # interest_tags가 None인 경우 빈 배열로 변환
        for product in products:
            if product.get("interest_tags") is None:
                product["interest_tags"] = []
        
        return {
            "success": True,
            "data": products,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"코너 영양제 목록 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="영양제 목록 조회 중 오류가 발생했습니다."
        )


@router.post("/{corner_id}/products")
async def add_corner_products(corner_id: int, data: ProductMappingBulk):
    """
    코너에 영양제 일괄 추가
    """
    try:
        # 코너 존재 확인
        corner_check = await app_db_manager.fetch_one(
            "SELECT id FROM supplement_corners WHERE id = %(corner_id)s",
            {"corner_id": corner_id}
        )
        if not corner_check:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="코너를 찾을 수 없습니다."
            )
        
        added_count = 0
        for product in data.products:
            # 이미 매핑되어 있는지 확인
            existing = await app_db_manager.fetch_one(
                """SELECT id FROM supplement_corner_products 
                   WHERE corner_id = %(corner_id)s AND product_id = %(product_id)s""",
                {"corner_id": corner_id, "product_id": product.product_id}
            )
            
            if not existing:
                insert_query = """
                    INSERT INTO supplement_corner_products (corner_id, product_id, display_order)
                    VALUES (%(corner_id)s, %(product_id)s, %(display_order)s)
                """
                await app_db_manager.execute(insert_query, {
                    "corner_id": corner_id,
                    "product_id": product.product_id,
                    "display_order": product.display_order
                })
                added_count += 1
        
        return {"success": True, "data": {"added_count": added_count}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 영양제 추가 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="영양제 추가 중 오류가 발생했습니다."
        )


@router.delete("/{corner_id}/products")
async def remove_corner_products(
    corner_id: int,
    product_ids: List[str] = Query(..., description="삭제할 영양제 ID 목록")
):
    """
    코너에서 영양제 삭제
    """
    try:
        if not product_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 영양제 ID를 지정해주세요."
            )
        
        delete_query = """
            DELETE FROM supplement_corner_products 
            WHERE corner_id = %(corner_id)s AND product_id = ANY(%(product_ids)s)
        """
        await app_db_manager.execute(delete_query, {
            "corner_id": corner_id,
            "product_ids": product_ids
        })
        
        return {"success": True, "data": {"deleted_count": len(product_ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"코너 영양제 삭제 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="영양제 삭제 중 오류가 발생했습니다."
        )


# ============================================
# 영양제 검색 API (팝업용)
# ============================================

@router.get("/search/products")
async def search_products(
    product_name: Optional[str] = Query(None, description="영양제명"),
    product_id: Optional[str] = Query(None, description="영양제 ID"),
    interest_tag: Optional[str] = Query(None, description="관심사 태그"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
):
    """
    영양제 검색 (코너 매핑용)
    """
    try:
        conditions = ["spm.is_active = true"]
        params = {}
        
        if product_name:
            conditions.append("spm.product_name ILIKE %(product_name)s")
            params["product_name"] = f"%{product_name}%"
        
        if product_id:
            conditions.append("spm.id::text ILIKE %(product_id)s")
            params["product_id"] = f"%{product_id}%"
        
        if interest_tag:
            conditions.append("""
                EXISTS (
                    SELECT 1 FROM product_ingredient_mapping pim
                    JOIN functional_ingredients fi ON pim.ingredient_id = fi.id
                    JOIN interest_ingredients ii ON fi.external_name = ii.ingredient_name
                    WHERE pim.product_id = spm.id AND ii.interest_name = %(interest_tag)s
                )
            """)
            params["interest_tag"] = interest_tag
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM supplement_products_master spm
            WHERE {where_clause}
        """
        count_result = await app_db_manager.fetch_one(count_query, params)
        total = count_result["total"] if count_result else 0
        
        # 목록 조회
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                spm.id as product_id,
                spm.product_name,
                spm.manufacturer as brand_name,
                spm.is_active as is_for_sale,
                (
                    SELECT ARRAY_AGG(DISTINCT ii.interest_name)
                    FROM product_ingredient_mapping pim
                    JOIN functional_ingredients fi ON pim.ingredient_id = fi.id
                    JOIN interest_ingredients ii ON fi.external_name = ii.ingredient_name
                    WHERE pim.product_id = spm.id
                ) as interest_tags
            FROM supplement_products_master spm
            WHERE {where_clause}
            ORDER BY spm.product_name ASC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        products = await app_db_manager.fetch_all(list_query, params)
        
        # interest_tags가 None인 경우 빈 배열로 변환
        for product in products:
            if product.get("interest_tags") is None:
                product["interest_tags"] = []
        
        return {
            "success": True,
            "data": products,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"영양제 검색 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="영양제 검색 중 오류가 발생했습니다."
        )

