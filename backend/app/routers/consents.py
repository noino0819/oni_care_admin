# ============================================
# 동의내용 관리 API 라우터
# ============================================
# 동의서 CRUD (App DB 사용)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/consents", tags=["Consents"])


def generate_consent_code(last_code: Optional[str]) -> str:
    """
    동의서 코드 생성 (0001, 0002, ...)
    """
    if not last_code:
        return "0001"
    try:
        next_num = int(last_code) + 1
        return str(next_num).zfill(4)
    except ValueError:
        return "0001"


@router.get("")
async def get_consents(
    title: Optional[str] = Query(None, description="동의서명"),
    classification: Optional[str] = Query(None, description="분류 (required,optional 쉼표구분)"),
    exposure_location: Optional[str] = Query(None, description="노출위치"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y,N 쉼표구분)"),
    sort_field: str = Query("consent_code", description="정렬 필드"),
    sort_direction: str = Query("asc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    동의내용 목록 조회 (App DB)
    """
    try:
        conditions = []
        params = {}
        
        # 동의서명 검색 (포함)
        if title:
            conditions.append("title ILIKE %(title)s")
            params["title"] = f"%{title}%"
        
        # 분류 필터 (다중 선택)
        if classification:
            classifications = [c.strip() for c in classification.split(",") if c.strip()]
            if classifications:
                conditions.append("classification = ANY(%(classifications)s)")
                params["classifications"] = classifications
        
        # 노출위치 필터
        if exposure_location:
            conditions.append("exposure_location = %(exposure_location)s")
            params["exposure_location"] = exposure_location
        
        # 사용여부 필터 (다중 선택)
        if is_active:
            active_values = [v.strip().upper() for v in is_active.split(",") if v.strip()]
            bool_values = []
            for v in active_values:
                if v == "Y":
                    bool_values.append(True)
                elif v == "N":
                    bool_values.append(False)
            if bool_values:
                conditions.append("is_active = ANY(%(is_active_values)s)")
                params["is_active_values"] = bool_values
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["consent_code", "title", "classification", "exposure_location", "is_active", "created_at", "updated_at"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "consent_code"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM consent_agreements {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        consents = await query(
            f"""
            SELECT id, consent_code, title, classification, exposure_location,
                   is_active, created_at, updated_at
            FROM consent_agreements
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        return {
            "success": True,
            "data": consents,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"동의내용 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{consent_id}")
async def get_consent(
    consent_id: int,
    current_user=Depends(get_current_user)
):
    """
    동의내용 상세 조회 (App DB)
    """
    try:
        consent = await query_one(
            """
            SELECT id, consent_code, title, classification, exposure_location,
                   content, is_active, created_by, updated_by, created_at, updated_at
            FROM consent_agreements 
            WHERE id = %(consent_id)s
            """,
            {"consent_id": consent_id},
            use_app_db=True
        )
        
        if not consent:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "동의서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=consent)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"동의내용 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=http_status.HTTP_201_CREATED)
async def create_consent(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    동의내용 등록 (App DB)
    """
    try:
        title = body.get("title")
        classification = body.get("classification")
        exposure_location = body.get("exposure_location")
        content = body.get("content")
        is_active = body.get("is_active", True)
        
        # 필수 필드 검증
        if not title or not title.strip():
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "동의서명을 입력해주세요."}
            )
        
        if len(title.strip()) > 30:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "동의서명은 30자 이내로 입력해주세요."}
            )
        
        if not classification:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "분류를 선택해주세요."}
            )
        
        if classification not in ["required", "optional"]:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "분류는 필수 또는 선택이어야 합니다."}
            )
        
        if not exposure_location:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "노출위치를 선택해주세요."}
            )
        
        valid_locations = ["signup", "notification_consent", "privacy_policy", "terms_of_service"]
        if exposure_location not in valid_locations:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 노출위치입니다."}
            )
        
        # 마지막 코드 조회 후 새 코드 생성
        last_consent = await query_one(
            "SELECT consent_code FROM consent_agreements ORDER BY consent_code DESC LIMIT 1",
            {},
            use_app_db=True
        )
        new_code = generate_consent_code(last_consent.get("consent_code") if last_consent else None)
        
        created_by = current_user.get("name", "") if current_user else ""
        
        result = await execute_returning(
            """
            INSERT INTO consent_agreements (consent_code, title, classification, exposure_location, content, is_active, created_by, updated_by)
            VALUES (%(consent_code)s, %(title)s, %(classification)s, %(exposure_location)s, %(content)s, %(is_active)s, %(created_by)s, %(created_by)s)
            RETURNING id, consent_code
            """,
            {
                "consent_code": new_code,
                "title": title.strip(),
                "classification": classification,
                "exposure_location": exposure_location,
                "content": content.strip() if content else None,
                "is_active": is_active,
                "created_by": created_by
            },
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id"), "consent_code": result.get("consent_code")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"동의내용 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{consent_id}")
async def update_consent(
    consent_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    동의내용 수정 (App DB)
    """
    try:
        update_fields = []
        params = {"consent_id": consent_id}
        
        # 업데이트 가능한 필드들
        if "title" in body:
            title = body["title"]
            if title and len(title.strip()) > 30:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "동의서명은 30자 이내로 입력해주세요."}
                )
            update_fields.append("title = %(title)s")
            params["title"] = title.strip() if title else None
        
        if "classification" in body:
            classification = body["classification"]
            if classification and classification not in ["required", "optional"]:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "분류는 필수 또는 선택이어야 합니다."}
                )
            update_fields.append("classification = %(classification)s")
            params["classification"] = classification
        
        if "exposure_location" in body:
            exposure_location = body["exposure_location"]
            valid_locations = ["signup", "notification_consent", "privacy_policy", "terms_of_service"]
            if exposure_location and exposure_location not in valid_locations:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 노출위치입니다."}
                )
            update_fields.append("exposure_location = %(exposure_location)s")
            params["exposure_location"] = exposure_location
        
        if "content" in body:
            update_fields.append("content = %(content)s")
            params["content"] = body["content"].strip() if body["content"] else None
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM consent_agreements WHERE id = %(consent_id)s",
                {"consent_id": consent_id},
                use_app_db=True
            )
            return ApiResponse(success=True, data=existing)
        
        updated_by = current_user.get("name", "") if current_user else ""
        update_fields.append("updated_by = %(updated_by)s")
        params["updated_by"] = updated_by
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE consent_agreements
            SET {', '.join(update_fields)}
            WHERE id = %(consent_id)s
            RETURNING *
            """,
            params,
            use_app_db=True
        )
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "동의서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"동의내용 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{consent_id}")
async def delete_consent(
    consent_id: int,
    current_user=Depends(get_current_user)
):
    """
    동의내용 삭제 (App DB)
    """
    try:
        affected = await execute(
            "DELETE FROM consent_agreements WHERE id = %(consent_id)s",
            {"consent_id": consent_id},
            use_app_db=True
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "동의서를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"동의내용 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/batch-delete")
async def batch_delete_consents(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    동의내용 일괄 삭제 (App DB)
    """
    try:
        ids = body.get("ids", [])
        
        if not ids:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."}
            )
        
        # INT 배열로 삭제
        affected = await execute(
            "DELETE FROM consent_agreements WHERE id = ANY(%(ids)s::int[])",
            {"ids": ids},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"deleted_count": affected})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"동의내용 일괄 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

