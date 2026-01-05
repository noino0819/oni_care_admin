# ============================================
# 포인트 API 라우터
# ============================================
# 포인트 내역 조회, 조정, 취소 (App DB)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/points", tags=["Points"])


@router.get("")
async def get_points(
    name: Optional[str] = Query(None, description="이름"),
    id: Optional[str] = Query(None, description="사용자 ID"),
    member_types: Optional[str] = Query(None, description="회원 유형 (콤마 구분)"),
    business_code: Optional[str] = Query(None, description="사업장 코드"),
    transaction_type: Optional[str] = Query(None, description="거래 유형"),
    created_from: Optional[str] = Query(None, description="시작일"),
    created_to: Optional[str] = Query(None, description="종료일"),
    sort_field: Optional[str] = Query(None, description="정렬 필드"),
    sort_direction: Optional[str] = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    포인트 내역 조회
    """
    try:
        conditions = []
        params = {}
        
        if name:
            conditions.append("u.name ILIKE %(name)s")
            params["name"] = f"%{name}%"
        
        if id:
            conditions.append("CAST(ph.user_id AS TEXT) LIKE %(id)s")
            params["id"] = f"%{id}%"
        
        if member_types:
            types = [t.strip() for t in member_types.split(",")]
            conditions.append("u.member_type = ANY(%(member_types)s)")
            params["member_types"] = types
        
        if business_code:
            conditions.append("u.business_code = %(business_code)s")
            params["business_code"] = business_code
        
        if transaction_type:
            conditions.append("ph.transaction_type = %(transaction_type)s")
            params["transaction_type"] = transaction_type
        
        if created_from:
            conditions.append("ph.created_at >= %(created_from)s")
            params["created_from"] = created_from
        
        if created_to:
            conditions.append("ph.created_at <= %(created_to)s::date + interval '1 day'")
            params["created_to"] = created_to
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬
        order_by = "ph.created_at DESC"
        if sort_field:
            direction = "ASC" if sort_direction == "asc" else "DESC"
            safe_fields = {"created_at": "ph.created_at", "points": "ph.points", "balance_after": "ph.balance_after"}
            if sort_field in safe_fields:
                order_by = f"{safe_fields[sort_field]} {direction}"
        
        # 전체 개수 조회
        count_sql = f"""
            SELECT COUNT(*) as count 
            FROM point_history ph
            LEFT JOIN users u ON ph.user_id = u.id
            {where_clause}
        """
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 목록 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        rows = await query(
            f"""
            SELECT 
                ph.id,
                ph.user_id,
                u.email,
                ph.transaction_type,
                ph.source,
                ph.source_detail,
                ph.points,
                ph.balance_after,
                ph.created_at,
                COALESCE(ph.is_revoked, false) as is_revoked
            FROM point_history ph
            LEFT JOIN users u ON ph.user_id = u.id
            {where_clause}
            ORDER BY {order_by}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        return {
            "success": True,
            "data": rows,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"포인트 내역 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{user_id}")
async def get_user_point_history(
    user_id: str,
    sort_field: Optional[str] = Query(None, description="정렬 필드"),
    sort_direction: Optional[str] = Query("desc", description="정렬 방향"),
    current_user=Depends(get_current_user)
):
    """
    특정 사용자의 포인트 내역 조회
    """
    try:
        # 정렬
        order_by = "ph.created_at DESC"
        if sort_field:
            direction = "ASC" if sort_direction == "asc" else "DESC"
            safe_fields = {"created_at": "ph.created_at", "points": "ph.points", "balance_after": "ph.balance_after"}
            if sort_field in safe_fields:
                order_by = f"{safe_fields[sort_field]} {direction}"
        
        rows = await query(
            f"""
            SELECT 
                ph.id,
                ph.user_id,
                u.email,
                ph.transaction_type,
                ph.source,
                ph.source_detail,
                ph.points,
                ph.balance_after,
                ph.created_at,
                COALESCE(ph.is_revoked, false) as is_revoked
            FROM point_history ph
            LEFT JOIN users u ON ph.user_id = u.id
            WHERE ph.user_id = %(user_id)s::uuid
            ORDER BY {order_by}
            """,
            {"user_id": user_id},
            use_app_db=True
        )
        
        return {"success": True, "data": rows}
    except Exception as e:
        logger.error(f"사용자 포인트 내역 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/history/{history_id}")
async def get_point_detail(
    history_id: str,
    current_user=Depends(get_current_user)
):
    """
    포인트 내역 상세 조회 (단일)
    """
    try:
        row = await query_one(
            """
            SELECT 
                ph.id,
                ph.user_id,
                u.email,
                ph.transaction_type,
                ph.source,
                ph.source_detail,
                ph.points,
                ph.balance_after,
                ph.created_at,
                COALESCE(ph.is_revoked, false) as is_revoked
            FROM point_history ph
            LEFT JOIN users u ON ph.user_id = u.id
            WHERE ph.id = %(history_id)s
            """,
            {"history_id": history_id},
            use_app_db=True
        )
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "포인트 내역을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"포인트 상세 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/{history_id}/revoke")
async def revoke_point_transaction(
    history_id: str,
    current_user=Depends(get_current_user)
):
    """
    포인트 거래 취소
    """
    try:
        # 기존 내역 조회
        existing = await query_one(
            "SELECT * FROM point_history WHERE id = %(history_id)s",
            {"history_id": history_id},
            use_app_db=True
        )
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "포인트 내역을 찾을 수 없습니다."}
            )
        
        if existing.get("is_revoked"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "ALREADY_REVOKED", "message": "이미 취소된 거래입니다."}
            )
        
        # 취소 처리
        await execute_returning(
            """
            UPDATE point_history 
            SET is_revoked = true, updated_at = NOW()
            WHERE id = %(history_id)s
            RETURNING id
            """,
            {"history_id": history_id},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"message": "취소되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"포인트 취소 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/adjust")
async def adjust_points(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    포인트 조정 (관리자)
    """
    try:
        user_id = body.get("user_id")
        points = body.get("points", 0)
        reason = body.get("reason", "")
        memo = body.get("memo", "")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "사용자 ID를 입력해주세요."}
            )
        
        if points == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "포인트를 입력해주세요."}
            )
        
        # 현재 잔액 조회
        user = await query_one(
            "SELECT id, total_points FROM users WHERE id = %(user_id)s",
            {"user_id": user_id},
            use_app_db=True
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "사용자를 찾을 수 없습니다."}
            )
        
        current_balance = user.get("total_points", 0) or 0
        new_balance = current_balance + points
        
        # 포인트 내역 등록
        transaction_type = "earn" if points > 0 else "use"
        result = await execute_returning(
            """
            INSERT INTO point_history (user_id, transaction_type, source, source_detail, points, balance_after)
            VALUES (%(user_id)s, %(transaction_type)s, %(source)s, %(source_detail)s, %(points)s, %(balance_after)s)
            RETURNING id
            """,
            {
                "user_id": user_id,
                "transaction_type": transaction_type,
                "source": "관리자 조정",
                "source_detail": f"{reason} - {memo}" if memo else reason,
                "points": abs(points),
                "balance_after": new_balance
            },
            use_app_db=True
        )
        
        # 사용자 잔액 업데이트
        await execute_returning(
            """
            UPDATE users SET total_points = %(new_balance)s, updated_at = NOW()
            WHERE id = %(user_id)s
            RETURNING id
            """,
            {"user_id": user_id, "new_balance": new_balance},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id"), "new_balance": new_balance})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"포인트 조정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

