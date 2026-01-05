# ============================================
# 공지사항 API 라우터
# ============================================
# 공지사항 CRUD (App DB 사용)

from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/notices", tags=["Notices"])


def calculate_status(start_date: Optional[date], end_date: Optional[date]) -> str:
    """공지사항 상태 계산"""
    from datetime import date as date_type
    today = date_type.today()
    
    if start_date is None or start_date > today:
        return "before"
    
    if end_date is None or end_date >= today:
        return "active"
    
    return "ended"


@router.get("")
async def get_notices(
    title: Optional[str] = Query(None, description="제목"),
    status: Optional[str] = Query(None, description="상태 (쉼표 구분: before,active,ended)"),
    visibility_scope: Optional[str] = Query(None, description="공개범위 (쉼표 구분)"),
    company_code: Optional[str] = Query(None, description="기업코드"),
    created_from: Optional[str] = Query(None, description="생성일 시작"),
    created_to: Optional[str] = Query(None, description="생성일 종료"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    공지사항 목록 조회 (App DB)
    """
    try:
        conditions = []
        params = {}
        
        if title:
            conditions.append("title ILIKE %(title)s")
            params["title"] = f"%{title}%"
        
        if visibility_scope:
            scope_list = [s.strip() for s in visibility_scope.split(",") if s.strip()]
            if scope_list:
                conditions.append("visibility_scope && %(visibility_scope)s::text[]")
                params["visibility_scope"] = "{" + ",".join(scope_list) + "}"
        
        if company_code:
            conditions.append("%(company_code)s = ANY(company_codes)")
            params["company_code"] = company_code
        
        if created_from:
            conditions.append("created_at >= %(created_from)s")
            params["created_from"] = created_from
        
        if created_to:
            conditions.append("created_at <= %(created_to)s")
            params["created_to"] = created_to + " 23:59:59"
        
        # 상태 필터
        status_filter = ""
        if status:
            status_list = [s.strip() for s in status.split(",") if s.strip()]
            if status_list and len(status_list) < 3:
                status_conditions = []
                if "before" in status_list:
                    status_conditions.append("(start_date IS NULL OR start_date > CURRENT_DATE)")
                if "active" in status_list:
                    status_conditions.append("(start_date IS NOT NULL AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE))")
                if "ended" in status_list:
                    status_conditions.append("(end_date IS NOT NULL AND end_date < CURRENT_DATE)")
                if status_conditions:
                    status_filter = f"AND ({' OR '.join(status_conditions)})"
        
        where_clause = f"WHERE {' AND '.join(conditions)} {status_filter}" if conditions else (f"WHERE 1=1 {status_filter}" if status_filter else "")
        
        # 정렬 검증
        allowed_sort_fields = ["title", "created_at", "start_date", "end_date"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM notices {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        notices = await query(
            f"""
            SELECT id, title, visibility_scope, company_codes, start_date, end_date, created_at
            FROM notices
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        # 상태 라벨 추가
        formatted_notices = []
        for notice in notices:
            formatted_notices.append({
                **notice,
                "status": calculate_status(notice.get("start_date"), notice.get("end_date"))
            })
        
        return {
            "success": True,
            "data": formatted_notices,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{notice_id}")
async def get_notice(
    notice_id: str,
    current_user=Depends(get_current_user)
):
    """
    공지사항 상세 조회 (App DB)
    """
    try:
        notice = await query_one(
            "SELECT * FROM notices WHERE id = %(notice_id)s",
            {"notice_id": notice_id},
            use_app_db=True
        )
        
        if not notice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        notice["status"] = calculate_status(notice.get("start_date"), notice.get("end_date"))
        
        return ApiResponse(success=True, data=notice)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_notice(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공지사항 등록 (App DB)
    """
    try:
        title = body.get("title")
        content = body.get("content")
        image_url = body.get("image_url")
        visibility_scope = body.get("visibility_scope", ["all"])
        company_codes = body.get("company_codes", [])
        store_visible = body.get("store_visible", False)
        start_date = body.get("start_date")
        end_date = body.get("end_date")
        
        if not title or not title.strip() or not content or not content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "제목과 내용을 입력해주세요."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO notices (
                title, content, image_url, visibility_scope, company_codes,
                store_visible, start_date, end_date, created_by, updated_by
            ) VALUES (
                %(title)s, %(content)s, %(image_url)s, %(visibility_scope)s, %(company_codes)s,
                %(store_visible)s, %(start_date)s, %(end_date)s, %(created_by)s, %(created_by)s
            )
            RETURNING id
            """,
            {
                "title": title.strip(),
                "content": content.strip(),
                "image_url": image_url,
                "visibility_scope": visibility_scope,
                "company_codes": company_codes,
                "store_visible": store_visible,
                "start_date": start_date,
                "end_date": end_date,
                "created_by": current_user.name
            },
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{notice_id}")
async def update_notice(
    notice_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공지사항 수정 (App DB)
    """
    try:
        update_fields = []
        params = {"notice_id": notice_id, "updated_by": current_user.name}
        
        for field in ["title", "content", "image_url", "visibility_scope", 
                      "company_codes", "store_visible", "start_date", "end_date"]:
            if field in body:
                update_fields.append(f"{field} = %({field})s")
                params[field] = body[field]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM notices WHERE id = %(notice_id)s",
                {"notice_id": notice_id},
                use_app_db=True
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE notices
            SET {', '.join(update_fields)}
            WHERE id = %(notice_id)s
            RETURNING *
            """,
            params,
            use_app_db=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{notice_id}")
async def delete_notice(
    notice_id: str,
    current_user=Depends(get_current_user)
):
    """
    공지사항 삭제 (App DB)
    """
    try:
        affected = await execute(
            "DELETE FROM notices WHERE id = %(notice_id)s",
            {"notice_id": notice_id},
            use_app_db=True
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


