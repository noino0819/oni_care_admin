# ============================================
# 1:1 문의 관리 API 라우터
# ============================================
# 1:1 문의 조회/답변 (App DB 사용)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one, execute_returning
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/inquiries", tags=["Inquiries"])


# 문의 유형 목록 (상수)
INQUIRY_TYPES = {
    1: '계정 연동 문제',
    2: '포인트 사용 문의',
    3: '쿠폰 관련 문의',
    4: '영양진단 관련 문의',
    5: '기타'
}


def mask_name(name: str) -> str:
    """고객명 마스킹 (김*강)"""
    if not name:
        return ""
    if len(name) == 1:
        return name
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def mask_id(user_id: str) -> str:
    """고객 ID 마스킹 (앞 4자리 이후 마스킹)"""
    if not user_id:
        return ""
    if len(user_id) <= 4:
        return user_id
    return user_id[:4] + "*" * min(6, len(user_id) - 4)


@router.get("")
async def get_inquiries(
    customer_id: Optional[str] = Query(None, description="고객 ID"),
    customer_name: Optional[str] = Query(None, description="고객명"),
    inquiry_type_id: Optional[int] = Query(None, description="문의 유형"),
    content: Optional[str] = Query(None, description="문의 내용"),
    status: Optional[str] = Query(None, description="처리상태 (answered,pending)"),
    created_from: Optional[str] = Query(None, description="등록일 시작"),
    created_to: Optional[str] = Query(None, description="등록일 종료"),
    answered_from: Optional[str] = Query(None, description="답변일 시작"),
    answered_to: Optional[str] = Query(None, description="답변일 종료"),
    answered_by: Optional[str] = Query(None, description="답변자 사번"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    1:1 문의 목록 조회 (App DB)
    """
    try:
        conditions = []
        params = {}
        
        # 고객 ID로 검색 (users 테이블 조인 필요)
        if customer_id:
            conditions.append("u.email ILIKE %(customer_id)s")
            params["customer_id"] = f"%{customer_id}%"
        
        # 고객명으로 검색
        if customer_name:
            conditions.append("u.name ILIKE %(customer_name)s")
            params["customer_name"] = f"%{customer_name}%"
        
        # 문의 유형
        if inquiry_type_id:
            conditions.append("i.inquiry_type_id = %(inquiry_type_id)s")
            params["inquiry_type_id"] = inquiry_type_id
        
        # 문의 내용 검색
        if content:
            conditions.append("i.content ILIKE %(content)s")
            params["content"] = f"%{content}%"
        
        # 처리상태 필터 (answered, pending)
        if status:
            status_values = [v.strip().lower() for v in status.split(',')]
            status_conditions = []
            if 'answered' in status_values:
                status_conditions.append("i.status = 'answered'")
            if 'pending' in status_values:
                status_conditions.append("i.status = 'pending'")
            if status_conditions:
                conditions.append(f"({' OR '.join(status_conditions)})")
        
        # 등록일 범위
        if created_from:
            conditions.append("i.created_at >= %(created_from)s")
            params["created_from"] = created_from
        if created_to:
            conditions.append("i.created_at <= %(created_to)s")
            params["created_to"] = created_to + " 23:59:59"
        
        # 답변일 범위
        if answered_from:
            conditions.append("i.answered_at >= %(answered_from)s")
            params["answered_from"] = answered_from
        if answered_to:
            conditions.append("i.answered_at <= %(answered_to)s")
            params["answered_to"] = answered_to + " 23:59:59"
        
        # 답변자 사번
        if answered_by:
            conditions.append("i.answered_by = %(answered_by)s")
            params["answered_by"] = answered_by
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["created_at", "answered_at", "status", "inquiry_type_id"]
        safe_field = f"i.{sort_field}" if sort_field in allowed_sort_fields else "i.created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"""
            SELECT COUNT(*) as count 
            FROM inquiries i
            LEFT JOIN users u ON i.user_id = u.id
            {where_clause}
        """
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        # 미답변 문의 상단 정렬
        inquiries = await query(
            f"""
            SELECT 
                i.id, i.user_id, i.inquiry_type_id, i.content, i.answer,
                i.status, i.answered_by, i.created_at, i.answered_at,
                u.email as customer_email, u.name as customer_name,
                it.name as inquiry_type_name,
                CASE WHEN i.status = 'pending' THEN true ELSE false END as is_new
            FROM inquiries i
            LEFT JOIN users u ON i.user_id = u.id
            LEFT JOIN inquiry_types it ON i.inquiry_type_id = it.id
            {where_clause}
            ORDER BY 
                CASE WHEN i.status = 'pending' THEN 0 ELSE 1 END,
                {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        # 마스킹 처리 및 포맷
        formatted_inquiries = []
        for inq in inquiries:
            formatted_inquiries.append({
                **inq,
                "customer_id_masked": mask_id(inq.get("customer_email", "")),
                "customer_name_display": inq.get("customer_name", ""),
                "inquiry_type_name": inq.get("inquiry_type_name") or INQUIRY_TYPES.get(inq.get("inquiry_type_id"), "기타"),
                "status_display": "답변 완료" if inq.get("status") == "answered" else "미답변"
            })
        
        return {
            "success": True,
            "data": formatted_inquiries,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"1:1 문의 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/types")
async def get_inquiry_types(
    current_user=Depends(get_current_user)
):
    """
    문의 유형 목록 조회 (App DB)
    """
    try:
        types = await query(
            """
            SELECT id, name, display_order, is_active
            FROM inquiry_types
            WHERE is_active = true
            ORDER BY display_order, id
            """,
            {},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data=types)
    except Exception as e:
        logger.error(f"문의 유형 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{inquiry_id}")
async def get_inquiry(
    inquiry_id: str,
    current_user=Depends(get_current_user)
):
    """
    1:1 문의 상세 조회 (App DB)
    """
    try:
        inquiry = await query_one(
            """
            SELECT 
                i.id, i.user_id, i.inquiry_type_id, i.content, i.answer,
                i.status, i.answered_by, i.created_at, i.answered_at, i.updated_at,
                u.email as customer_email, u.name as customer_name,
                it.name as inquiry_type_name
            FROM inquiries i
            LEFT JOIN users u ON i.user_id = u.id
            LEFT JOIN inquiry_types it ON i.inquiry_type_id = it.id
            WHERE i.id = %(inquiry_id)s
            """,
            {"inquiry_id": inquiry_id},
            use_app_db=True
        )
        
        if not inquiry:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "문의를 찾을 수 없습니다."}
            )
        
        # 마스킹 처리
        inquiry["customer_id_masked"] = mask_id(inquiry.get("customer_email", ""))
        inquiry["customer_name_masked"] = mask_name(inquiry.get("customer_name", ""))
        inquiry["inquiry_type_name"] = inquiry.get("inquiry_type_name") or INQUIRY_TYPES.get(inquiry.get("inquiry_type_id"), "기타")
        inquiry["status_display"] = "답변 완료" if inquiry.get("status") == "answered" else "미답변"
        
        return ApiResponse(success=True, data=inquiry)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"1:1 문의 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{inquiry_id}/answer")
async def answer_inquiry(
    inquiry_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    1:1 문의 답변 등록/수정 (App DB)
    """
    try:
        answer = body.get("answer", "").strip()
        
        if not answer:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "답변 내용을 입력해주세요."}
            )
        
        if len(answer) > 300:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "답변은 300자 이내로 입력해주세요."}
            )
        
        # 현재 로그인한 관리자의 사번 사용
        answered_by = current_user.get("login_id") or current_user.get("email", "")
        
        result = await execute_returning(
            """
            UPDATE inquiries
            SET answer = %(answer)s,
                status = 'answered',
                answered_by = %(answered_by)s,
                answered_at = NOW(),
                updated_at = NOW()
            WHERE id = %(inquiry_id)s
            RETURNING *
            """,
            {
                "inquiry_id": inquiry_id,
                "answer": answer,
                "answered_by": answered_by
            },
            use_app_db=True
        )
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "문의를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"1:1 문의 답변 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

