# ============================================
# 쿠폰 마스터 관리 API
# ============================================
# 챌린지 보상용 쿠폰 템플릿 관리
# Admin DB의 coupon_master 테이블 사용

from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Query, HTTPException, status, Path
from app.config.database import db_manager
from app.core.logger import logger

router = APIRouter(prefix="/api/v1/admin/coupon-master", tags=["쿠폰 마스터 관리"])


# ============================================
# Pydantic 모델
# ============================================

class CouponMasterCreate(BaseModel):
    """쿠폰 마스터 생성 요청"""
    coupon_code: str
    coupon_name: str
    coupon_type: str = "discount"  # discount, free_item
    discount_value: int = 0
    discount_type: str = "fixed"  # fixed, percentage
    min_order_amount: int = 0
    max_discount_amount: Optional[int] = None
    valid_days: int = 30
    is_active: bool = True


class CouponMasterUpdate(BaseModel):
    """쿠폰 마스터 수정 요청"""
    coupon_name: Optional[str] = None
    coupon_type: Optional[str] = None
    discount_value: Optional[int] = None
    discount_type: Optional[str] = None
    min_order_amount: Optional[int] = None
    max_discount_amount: Optional[int] = None
    valid_days: Optional[int] = None
    is_active: Optional[bool] = None


# ============================================
# 쿠폰 마스터 목록 조회
# ============================================

@router.get("")
async def get_coupon_masters(
    coupon_code: Optional[str] = Query(None, description="쿠폰 코드 검색"),
    coupon_name: Optional[str] = Query(None, description="쿠폰명 검색"),
    coupon_type: Optional[str] = Query(None, description="쿠폰 유형"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y/N)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    쿠폰 마스터 목록 조회
    """
    try:
        conditions = ["1=1"]
        params = {}
        
        if coupon_code:
            conditions.append("coupon_code ILIKE %(coupon_code)s")
            params["coupon_code"] = f"%{coupon_code}%"
        
        if coupon_name:
            conditions.append("coupon_name ILIKE %(coupon_name)s")
            params["coupon_name"] = f"%{coupon_name}%"
        
        if coupon_type:
            conditions.append("coupon_type = %(coupon_type)s")
            params["coupon_type"] = coupon_type
        
        if is_active is not None:
            conditions.append("is_active = %(is_active)s")
            params["is_active"] = is_active.lower() == 'y'
        
        where_clause = " AND ".join(conditions)
        
        # 총 건수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM coupon_master
            WHERE {where_clause}
        """
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(count_query, params)
                count_result = await cur.fetchone()
                total = count_result["total"] if count_result else 0
        
        # 목록 조회
        offset = (page - 1) * page_size
        list_query = f"""
            SELECT 
                id,
                coupon_code,
                coupon_name,
                coupon_type,
                discount_value,
                discount_type,
                min_order_amount,
                max_discount_amount,
                valid_days,
                is_active,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM coupon_master
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        params["limit"] = page_size
        params["offset"] = offset
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(list_query, params)
                rows = await cur.fetchall()
                coupon_masters = [dict(row) for row in rows]
        
        # 표시용 변환
        type_map = {
            "discount": "할인",
            "free_item": "무료 상품"
        }
        discount_type_map = {
            "fixed": "정액",
            "percentage": "정률"
        }
        
        for cm in coupon_masters:
            cm["coupon_type_display"] = type_map.get(cm["coupon_type"], cm["coupon_type"])
            cm["discount_type_display"] = discount_type_map.get(cm["discount_type"], cm["discount_type"])
            if cm["discount_type"] == "fixed":
                cm["discount_value_display"] = f"{cm['discount_value']:,}원"
            else:
                cm["discount_value_display"] = f"{cm['discount_value']}%"
        
        return {
            "success": True,
            "data": coupon_masters,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size
            }
        }
    except Exception as e:
        logger.error(f"쿠폰 마스터 목록 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 목록 조회 중 오류가 발생했습니다."
        )


# ============================================
# 쿠폰 마스터 상세 조회
# ============================================

@router.get("/{master_id}")
async def get_coupon_master(
    master_id: int = Path(..., description="쿠폰 마스터 ID"),
):
    """
    쿠폰 마스터 상세 조회
    """
    try:
        query = """
            SELECT 
                id,
                coupon_code,
                coupon_name,
                coupon_type,
                discount_value,
                discount_type,
                min_order_amount,
                max_discount_amount,
                valid_days,
                is_active,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM coupon_master
            WHERE id = %(master_id)s
        """
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, {"master_id": master_id})
                row = await cur.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="쿠폰 마스터를 찾을 수 없습니다."
            )
        
        return {
            "success": True,
            "data": dict(row)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"쿠폰 마스터 상세 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 상세 조회 중 오류가 발생했습니다."
        )


# ============================================
# 쿠폰 마스터 생성
# ============================================

@router.post("")
async def create_coupon_master(
    data: CouponMasterCreate,
):
    """
    쿠폰 마스터 생성
    """
    try:
        # 쿠폰 코드 중복 확인
        check_query = "SELECT id FROM coupon_master WHERE coupon_code = %(coupon_code)s"
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(check_query, {"coupon_code": data.coupon_code})
                existing = await cur.fetchone()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 쿠폰 코드입니다."
            )
        
        # 쿠폰 마스터 생성
        insert_query = """
            INSERT INTO coupon_master (
                coupon_code, coupon_name, coupon_type,
                discount_value, discount_type, min_order_amount,
                max_discount_amount, valid_days, is_active
            ) VALUES (
                %(coupon_code)s, %(coupon_name)s, %(coupon_type)s,
                %(discount_value)s, %(discount_type)s, %(min_order_amount)s,
                %(max_discount_amount)s, %(valid_days)s, %(is_active)s
            )
            RETURNING id
        """
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(insert_query, data.model_dump())
                result = await cur.fetchone()
                await conn.commit()
        
        return {
            "success": True,
            "data": {"id": result["id"]},
            "message": "쿠폰 마스터가 생성되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"쿠폰 마스터 생성 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 생성 중 오류가 발생했습니다."
        )


# ============================================
# 쿠폰 마스터 수정
# ============================================

@router.put("/{master_id}")
async def update_coupon_master(
    master_id: int = Path(..., description="쿠폰 마스터 ID"),
    data: CouponMasterUpdate = None,
):
    """
    쿠폰 마스터 수정
    """
    try:
        # 존재 확인
        check_query = "SELECT id FROM coupon_master WHERE id = %(master_id)s"
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(check_query, {"master_id": master_id})
                existing = await cur.fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="쿠폰 마스터를 찾을 수 없습니다."
            )
        
        # 업데이트할 필드 생성
        update_fields = []
        update_params = {"master_id": master_id}
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                update_fields.append(f"{key} = %({key})s")
                update_params[key] = value
        
        if not update_fields:
            return {"success": True, "message": "업데이트할 내용이 없습니다."}
        
        update_fields.append("updated_at = NOW()")
        
        update_query = f"""
            UPDATE coupon_master
            SET {', '.join(update_fields)}
            WHERE id = %(master_id)s
            RETURNING id
        """
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(update_query, update_params)
                result = await cur.fetchone()
                await conn.commit()
        
        return {
            "success": True,
            "data": {"id": result["id"]},
            "message": "쿠폰 마스터가 수정되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"쿠폰 마스터 수정 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 수정 중 오류가 발생했습니다."
        )


# ============================================
# 쿠폰 마스터 삭제
# ============================================

@router.delete("/{master_id}")
async def delete_coupon_master(
    master_id: int = Path(..., description="쿠폰 마스터 ID"),
):
    """
    쿠폰 마스터 삭제
    """
    try:
        # 존재 확인
        check_query = "SELECT id FROM coupon_master WHERE id = %(master_id)s"
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(check_query, {"master_id": master_id})
                existing = await cur.fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="쿠폰 마스터를 찾을 수 없습니다."
            )
        
        # 삭제
        delete_query = "DELETE FROM coupon_master WHERE id = %(master_id)s"
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(delete_query, {"master_id": master_id})
                await conn.commit()
        
        return {
            "success": True,
            "message": "쿠폰 마스터가 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"쿠폰 마스터 삭제 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 삭제 중 오류가 발생했습니다."
        )


# ============================================
# 쿠폰 마스터 일괄 삭제
# ============================================

@router.delete("")
async def delete_coupon_masters(
    ids: str = Query(..., description="삭제할 ID 목록 (콤마 구분)"),
):
    """
    쿠폰 마스터 일괄 삭제
    """
    try:
        id_list = [int(id.strip()) for id in ids.split(",") if id.strip()]
        
        if not id_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 쿠폰 마스터 ID를 지정해주세요."
            )
        
        # 삭제
        delete_query = "DELETE FROM coupon_master WHERE id = ANY(%(ids)s)"
        
        async with db_manager.get_async_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(delete_query, {"ids": id_list})
                deleted_count = cur.rowcount
                await conn.commit()
        
        return {
            "success": True,
            "data": {"deleted_count": deleted_count},
            "message": f"{deleted_count}개의 쿠폰 마스터가 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"쿠폰 마스터 일괄 삭제 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="쿠폰 마스터 일괄 삭제 중 오류가 발생했습니다."
        )

