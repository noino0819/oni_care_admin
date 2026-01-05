# ============================================
# 지점별 고객 API 라우터
# ============================================
# 지점별 고객 CRUD

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/store-customers", tags=["Store Customers"])


@router.get("")
async def get_store_customers(
    member_code: Optional[str] = Query(None, description="회원코드"),
    customer_name: Optional[str] = Query(None, description="고객명"),
    phone: Optional[str] = Query(None, description="전화번호"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    지점별 고객 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if member_code:
            conditions.append("member_code ILIKE %(member_code)s")
            params["member_code"] = f"%{member_code}%"
        
        if customer_name:
            conditions.append("customer_name ILIKE %(customer_name)s")
            params["customer_name"] = f"%{customer_name}%"
        
        if phone:
            conditions.append("phone ILIKE %(phone)s")
            params["phone"] = f"%{phone}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.store_customers {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data = await query(
            f"""
            SELECT id, member_code, customer_name, phone, first_store_id, authorized_stores,
                   push_agreed, sms_agreed, registered_at, joined_at, last_visit_at,
                   created_at, updated_at
            FROM public.store_customers
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params
        )
        
        return {
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"지점별 고객 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "고객 조회 중 오류가 발생했습니다."}
        )


@router.get("/{customer_id}")
async def get_store_customer(
    customer_id: str,
    current_user=Depends(get_current_user)
):
    """
    지점별 고객 상세 조회
    """
    try:
        customer = await query_one(
            "SELECT * FROM public.store_customers WHERE id = %(customer_id)s",
            {"customer_id": customer_id}
        )
        
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "고객을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=customer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"지점별 고객 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "고객 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_store_customer(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    지점별 고객 등록
    """
    try:
        member_code = body.get("member_code")
        customer_name = body.get("customer_name")
        phone = body.get("phone")
        first_store_id = body.get("first_store_id")
        authorized_stores = body.get("authorized_stores", [])
        push_agreed = body.get("push_agreed", False)
        sms_agreed = body.get("sms_agreed", False)
        registered_at = body.get("registered_at")
        joined_at = body.get("joined_at")
        
        if not member_code or not customer_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "회원코드와 고객명은 필수입니다."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO public.store_customers 
                (member_code, customer_name, phone, first_store_id, authorized_stores,
                 push_agreed, sms_agreed, registered_at, joined_at)
            VALUES 
                (%(member_code)s, %(customer_name)s, %(phone)s, %(first_store_id)s, %(authorized_stores)s,
                 %(push_agreed)s, %(sms_agreed)s, %(registered_at)s, %(joined_at)s)
            RETURNING *
            """,
            {
                "member_code": member_code,
                "customer_name": customer_name,
                "phone": phone,
                "first_store_id": first_store_id,
                "authorized_stores": authorized_stores,
                "push_agreed": push_agreed,
                "sms_agreed": sms_agreed,
                "registered_at": registered_at,
                "joined_at": joined_at
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"지점별 고객 등록 오류: {str(e)}", exc_info=True)
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "DUPLICATE_KEY", "message": "이미 존재하는 회원코드입니다."}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "고객 등록 중 오류가 발생했습니다."}
        )


@router.put("/{customer_id}")
async def update_store_customer(
    customer_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    지점별 고객 수정
    """
    try:
        update_fields = []
        params = {"customer_id": customer_id}
        
        for field in ["customer_name", "phone", "first_store_id", "authorized_stores",
                      "push_agreed", "sms_agreed", "registered_at", "joined_at", "last_visit_at"]:
            if field in body:
                update_fields.append(f"{field} = %({field})s")
                params[field] = body[field]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.store_customers WHERE id = %(customer_id)s",
                {"customer_id": customer_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.store_customers
            SET {', '.join(update_fields)}
            WHERE id = %(customer_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "고객을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"지점별 고객 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "고객 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{customer_id}")
async def delete_store_customer(
    customer_id: str,
    current_user=Depends(get_current_user)
):
    """
    지점별 고객 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.store_customers WHERE id = %(customer_id)s",
            {"customer_id": customer_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "고객을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"지점별 고객 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "고객 삭제 중 오류가 발생했습니다."}
        )

