# ============================================
# 동의내용 관리 API 라우터
# ============================================
# terms 테이블 사용 (App DB)

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
        # 숫자만 추출하여 증가
        digits = ''.join(filter(str.isdigit, last_code))
        if digits:
            next_num = int(digits) + 1
            return str(next_num).zfill(4)
        return "0001"
    except ValueError:
        return "0001"


@router.get("")
async def get_consents(
    title: Optional[str] = Query(None, description="동의서명"),
    classification: Optional[str] = Query(None, description="분류 (required,optional 쉼표구분)"),
    exposure_location: Optional[str] = Query(None, description="노출위치"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y,N 쉼표구분)"),
    sort_field: str = Query("code", description="정렬 필드"),
    sort_direction: str = Query("asc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    동의내용 목록 조회 (App DB - terms 테이블)
    """
    try:
        conditions = []
        params = {}
        
        # 동의서명 검색 (포함)
        if title:
            conditions.append("title ILIKE %(title)s")
            params["title"] = f"%{title}%"
        
        # 분류 필터 (다중 선택) - is_required를 classification으로 변환
        if classification:
            classifications = [c.strip() for c in classification.split(",") if c.strip()]
            if classifications:
                bool_values = []
                for c in classifications:
                    if c == "required":
                        bool_values.append(True)
                    elif c == "optional":
                        bool_values.append(False)
                if bool_values:
                    conditions.append("is_required = ANY(%(is_required_values)s)")
                    params["is_required_values"] = bool_values
        
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
        
        # 정렬 필드 매핑 (프론트엔드 필드명 → DB 필드명)
        field_mapping = {
            "consent_code": "code",
            "code": "code",
            "title": "title",
            "classification": "is_required",
            "exposure_location": "exposure_location",
            "is_active": "is_active",
            "created_at": "created_at",
            "updated_at": "updated_at"
        }
        
        allowed_sort_fields = list(field_mapping.values())
        mapped_field = field_mapping.get(sort_field, "code")
        safe_field = mapped_field if mapped_field in allowed_sort_fields else "code"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM terms {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        rows = await query(
            f"""
            SELECT id, code, title, is_required, exposure_location,
                   is_active, created_at, updated_at
            FROM terms
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        # 응답 형식 변환 (is_required → classification, code → consent_code)
        consents = []
        for row in rows:
            consents.append({
                "id": row.get("id"),
                "consent_code": row.get("code"),
                "title": row.get("title"),
                "classification": "required" if row.get("is_required") else "optional",
                "exposure_location": row.get("exposure_location"),
                "is_active": row.get("is_active", True),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
            })
        
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
    consent_id: str,
    current_user=Depends(get_current_user)
):
    """
    동의내용 상세 조회 (App DB - terms 테이블)
    """
    try:
        row = await query_one(
            """
            SELECT id, code, title, is_required, exposure_location,
                   content, is_active, created_by, updated_by, created_at, updated_at
            FROM terms 
            WHERE id = %(consent_id)s
            """,
            {"consent_id": consent_id},
            use_app_db=True
        )
        
        if not row:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "동의서를 찾을 수 없습니다."}
            )
        
        # 응답 형식 변환
        consent = {
            "id": row.get("id"),
            "consent_code": row.get("code"),
            "title": row.get("title"),
            "classification": "required" if row.get("is_required") else "optional",
            "exposure_location": row.get("exposure_location"),
            "content": row.get("content"),
            "is_active": row.get("is_active", True),
            "created_by": row.get("created_by"),
            "updated_by": row.get("updated_by"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
        
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
    동의내용 등록 (App DB - terms 테이블)
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
        
        # classification → is_required 변환
        is_required = classification == "required"
        
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
        last_term = await query_one(
            "SELECT code FROM terms ORDER BY code DESC LIMIT 1",
            {},
            use_app_db=True
        )
        new_code = generate_consent_code(last_term.get("code") if last_term else None)
        
        created_by = current_user.get("name", "") if current_user else ""
        
        result = await execute_returning(
            """
            INSERT INTO terms (code, title, is_required, exposure_location, content, is_active, created_by, updated_by)
            VALUES (%(code)s, %(title)s, %(is_required)s, %(exposure_location)s, %(content)s, %(is_active)s, %(created_by)s, %(created_by)s)
            RETURNING id, code
            """,
            {
                "code": new_code,
                "title": title.strip(),
                "is_required": is_required,
                "exposure_location": exposure_location,
                "content": content.strip() if content else "",
                "is_active": is_active,
                "created_by": created_by
            },
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id"), "consent_code": result.get("code")})
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
    consent_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    동의내용 수정 (App DB - terms 테이블)
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
            update_fields.append("is_required = %(is_required)s")
            params["is_required"] = classification == "required" if classification else False
        
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
            params["content"] = body["content"].strip() if body["content"] else ""
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM terms WHERE id = %(consent_id)s",
                {"consent_id": consent_id},
                use_app_db=True
            )
            return ApiResponse(success=True, data=existing)
        
        updated_by = current_user.get("name", "") if current_user else ""
        update_fields.append("updated_by = %(updated_by)s")
        params["updated_by"] = updated_by
        update_fields.append("updated_at = NOW()")
        
        row = await execute_returning(
            f"""
            UPDATE terms
            SET {', '.join(update_fields)}
            WHERE id = %(consent_id)s
            RETURNING *
            """,
            params,
            use_app_db=True
        )
        
        if not row:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "동의서를 찾을 수 없습니다."}
            )
        
        # 응답 형식 변환
        result = {
            "id": row.get("id"),
            "consent_code": row.get("code"),
            "title": row.get("title"),
            "classification": "required" if row.get("is_required") else "optional",
            "exposure_location": row.get("exposure_location"),
            "content": row.get("content"),
            "is_active": row.get("is_active", True),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
        
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
    consent_id: str,
    current_user=Depends(get_current_user)
):
    """
    동의내용 삭제 (App DB - terms 테이블)
    """
    try:
        affected = await execute(
            "DELETE FROM terms WHERE id = %(consent_id)s",
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
    동의내용 일괄 삭제 (App DB - terms 테이블)
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
            "DELETE FROM terms WHERE id = ANY(%(ids)s::uuid[])",
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
