# ============================================
# 공지사항 API 라우터
# ============================================
# 공지사항 CRUD (App DB 사용)
# 
# 실제 테이블 구조:
#   id: uuid
#   title: text
#   content: text
#   image_url: text
#   is_active: boolean
#   created_at: timestamp with time zone
#   updated_at: timestamp with time zone

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/notices", tags=["Notices"])


@router.get("")
async def get_notices(
    title: Optional[str] = Query(None, description="제목"),
    is_active: Optional[bool] = Query(None, description="활성 상태"),
    created_from: Optional[str] = Query(None, description="생성일 시작"),
    created_to: Optional[str] = Query(None, description="생성일 종료"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="페이지 크기"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기 (page_size 별칭)"),
    # 아래 파라미터들은 프론트엔드 호환용 (현재 미사용)
    status: Optional[str] = Query(None, description="상태 (미사용)"),
    visibility_scope: Optional[str] = Query(None, description="공개범위 (미사용)"),
    company_code: Optional[str] = Query(None, description="기업코드 (미사용)"),
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
        
        if is_active is not None:
            conditions.append("is_active = %(is_active)s")
            params["is_active"] = is_active
        
        if created_from:
            conditions.append("created_at >= %(created_from)s")
            params["created_from"] = created_from
        
        if created_to:
            conditions.append("created_at <= %(created_to)s")
            params["created_to"] = created_to + " 23:59:59"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["title", "created_at", "updated_at", "is_active"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM notices {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 페이지 크기 결정 (page_size가 있으면 사용, 없으면 limit 사용)
        actual_page_size = page_size if page_size is not None else limit
        
        # 데이터 조회
        offset = (page - 1) * actual_page_size
        params["limit"] = actual_page_size
        params["offset"] = offset
        
        notices = await query(
            f"""
            SELECT id, title, content, image_url, is_active, created_at, updated_at
            FROM notices
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        # 프론트엔드 호환을 위한 기본값 설정
        formatted_notices = []
        for notice in notices:
            formatted_notices.append({
                **notice,
                # 프론트엔드에서 기대하는 필드 기본값
                "visibility_scope": ["all"],
                "company_codes": [],
                "start_date": None,
                "end_date": None,
                "status": "active" if notice.get("is_active", True) else "ended"
            })
        
        return {
            "success": True,
            "data": formatted_notices,
            "pagination": {
                "page": page,
                "limit": actual_page_size,
                "total": total,
                "total_pages": (total + actual_page_size - 1) // actual_page_size if actual_page_size > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        # 프론트엔드 호환을 위한 기본값 설정
        notice["visibility_scope"] = ["all"]
        notice["company_codes"] = []
        notice["start_date"] = None
        notice["end_date"] = None
        notice["status"] = "active" if notice.get("is_active", True) else "ended"
        
        return ApiResponse(success=True, data=notice)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=http_status.HTTP_201_CREATED)
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
        is_active = body.get("is_active", True)
        
        if not title or not title.strip():
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "제목을 입력해주세요."}
            )
        
        result = await execute_returning(
            """
            INSERT INTO notices (title, content, image_url, is_active)
            VALUES (%(title)s, %(content)s, %(image_url)s, %(is_active)s)
            RETURNING id
            """,
            {
                "title": title.strip(),
                "content": content.strip() if content else None,
                "image_url": image_url,
                "is_active": is_active
            },
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        params = {"notice_id": notice_id}
        
        # 실제 테이블에 존재하는 컬럼만 업데이트
        for field in ["title", "content", "image_url", "is_active"]:
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
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "공지사항을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/batch-delete")
async def batch_delete_notices(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    공지사항 일괄 삭제 (App DB)
    """
    try:
        ids = body.get("ids", [])
        
        if not ids:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."}
            )
        
        # UUID 배열로 삭제
        affected = await execute(
            "DELETE FROM notices WHERE id = ANY(%(ids)s::uuid[])",
            {"ids": ids},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"deleted_count": affected})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"공지사항 일괄 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )
