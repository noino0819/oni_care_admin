# ============================================
# 건강목표 유형 관리 API 라우터
# ============================================
# 건강목표 유형 CRUD (Admin DB 사용)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/health-goal-types", tags=["Health Goal Types"])


@router.get("")
async def get_health_goal_types(
    type_name: Optional[str] = Query(None, description="유형명"),
    disease: Optional[str] = Query(None, description="질병"),
    bmi_range: Optional[str] = Query(None, description="BMI 범위"),
    interest_priority: Optional[str] = Query(None, description="관심사 1순위"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y,N 쉼표구분)"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        # 유형명 검색 (포함)
        if type_name:
            conditions.append("type_name ILIKE %(type_name)s")
            params["type_name"] = f"%{type_name}%"
        
        # 질병 필터
        if disease:
            conditions.append("disease = %(disease)s")
            params["disease"] = disease
        
        # BMI 범위 필터
        if bmi_range:
            conditions.append("bmi_range = %(bmi_range)s")
            params["bmi_range"] = bmi_range
        
        # 관심사 1순위 필터
        if interest_priority:
            conditions.append("interest_priority = %(interest_priority)s")
            params["interest_priority"] = interest_priority
        
        # 사용여부 필터
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
        allowed_sort_fields = ["id", "type_name", "disease", "bmi_range", "interest_priority", "is_active", "created_at", "updated_at"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM health_goal_types {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        type_list = await query(
            f"""
            SELECT id, type_name, disease, bmi_range, interest_priority,
                   is_active, created_at, updated_at
            FROM health_goal_types
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params
        )
        
        return {
            "success": True,
            "data": type_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"건강목표 유형 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/diseases")
async def get_diseases(
    current_user=Depends(get_current_user)
):
    """
    질병 목록 조회 (공통코드 또는 하드코딩)
    """
    try:
        # 공통코드에서 질병 목록을 가져오거나 하드코딩된 목록 반환
        # 먼저 공통코드 테이블에서 조회 시도
        diseases = await query(
            """
            SELECT code_value as value, code_name as label
            FROM common_codes cc
            JOIN common_code_master ccm ON cc.master_id = ccm.id
            WHERE ccm.code_name = 'DISEASE'
            AND cc.is_active = true
            ORDER BY cc.sort_order, cc.code_name
            """
        )
        
        if not diseases:
            # 하드코딩된 기본 질병 목록
            diseases = [
                {"value": "none", "label": "해당없음"},
                {"value": "diabetes", "label": "당뇨"},
                {"value": "hypertension", "label": "고혈압"},
                {"value": "hyperlipidemia", "label": "고지혈증"},
                {"value": "kidney", "label": "신장질환"},
                {"value": "liver", "label": "간질환"},
                {"value": "heart", "label": "심장질환"},
            ]
        
        return ApiResponse(success=True, data=diseases)
    except Exception as e:
        logger.error(f"질병 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/bmi-ranges")
async def get_bmi_ranges(
    current_user=Depends(get_current_user)
):
    """
    BMI 범위 목록 조회
    """
    try:
        bmi_ranges = [
            {"value": "underweight", "label": "저체중"},
            {"value": "normal", "label": "정상"},
            {"value": "overweight", "label": "과체중"},
            {"value": "obese", "label": "비만"},
        ]
        
        return ApiResponse(success=True, data=bmi_ranges)
    except Exception as e:
        logger.error(f"BMI 범위 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/interests")
async def get_interests(
    current_user=Depends(get_current_user)
):
    """
    관심사 목록 조회 (공통코드 또는 컨텐츠 카테고리에서)
    """
    try:
        # 컨텐츠 카테고리에서 관심사 유형 조회
        interests = await query(
            """
            SELECT id::text as value, category_name as label
            FROM content_categories
            WHERE category_type = 'interest'
            AND is_active = true
            ORDER BY display_order, category_name
            """
        )
        
        if not interests:
            # 하드코딩된 기본 관심사 목록
            interests = [
                {"value": "all", "label": "전체"},
                {"value": "diet", "label": "다이어트"},
                {"value": "muscle", "label": "근력강화"},
                {"value": "health", "label": "건강관리"},
                {"value": "nutrition", "label": "영양관리"},
            ]
        else:
            # 전체 옵션 추가
            interests.insert(0, {"value": "all", "label": "전체"})
        
        return ApiResponse(success=True, data=interests)
    except Exception as e:
        logger.error(f"관심사 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{type_id}")
async def get_health_goal_type(
    type_id: int,
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 상세 조회
    """
    try:
        goal_type = await query_one(
            """
            SELECT id, type_name, disease, bmi_range, interest_priority,
                   is_active, created_by, updated_by, created_at, updated_at
            FROM health_goal_types
            WHERE id = %(type_id)s
            """,
            {"type_id": type_id}
        )
        
        if not goal_type:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "건강목표 유형을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=goal_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"건강목표 유형 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=http_status.HTTP_201_CREATED)
async def create_health_goal_type(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 등록
    """
    try:
        type_name = body.get("type_name")
        disease = body.get("disease")
        bmi_range = body.get("bmi_range")
        interest_priority = body.get("interest_priority")
        is_active = body.get("is_active", True)
        
        # 필수 필드 검증
        if not type_name or not type_name.strip():
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유형명을 입력해주세요."}
            )
        
        if len(type_name.strip()) > 10:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유형명은 10자 이내로 입력해주세요."}
            )
        
        # BMI 범위 검증
        valid_bmi_ranges = ["underweight", "normal", "overweight", "obese", None, ""]
        if bmi_range and bmi_range not in valid_bmi_ranges:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 BMI 범위입니다."}
            )
        
        created_by = current_user.get("name", "") if current_user else ""
        
        result = await execute_returning(
            """
            INSERT INTO health_goal_types (
                type_name, disease, bmi_range, interest_priority,
                is_active, created_by, updated_by
            )
            VALUES (
                %(type_name)s, %(disease)s, %(bmi_range)s, %(interest_priority)s,
                %(is_active)s, %(created_by)s, %(created_by)s
            )
            RETURNING id
            """,
            {
                "type_name": type_name.strip(),
                "disease": disease if disease else None,
                "bmi_range": bmi_range if bmi_range else None,
                "interest_priority": interest_priority if interest_priority else None,
                "is_active": is_active,
                "created_by": created_by
            }
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"건강목표 유형 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{type_id}")
async def update_health_goal_type(
    type_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 수정
    """
    try:
        update_fields = []
        params = {"type_id": type_id}
        
        # 업데이트 가능한 필드들
        if "type_name" in body:
            type_name = body["type_name"]
            if type_name and len(type_name.strip()) > 10:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "유형명은 10자 이내로 입력해주세요."}
                )
            update_fields.append("type_name = %(type_name)s")
            params["type_name"] = type_name.strip() if type_name else None
        
        if "disease" in body:
            update_fields.append("disease = %(disease)s")
            params["disease"] = body["disease"] if body["disease"] else None
        
        if "bmi_range" in body:
            bmi_range = body["bmi_range"]
            valid_bmi_ranges = ["underweight", "normal", "overweight", "obese", None, ""]
            if bmi_range and bmi_range not in valid_bmi_ranges:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 BMI 범위입니다."}
                )
            update_fields.append("bmi_range = %(bmi_range)s")
            params["bmi_range"] = bmi_range if bmi_range else None
        
        if "interest_priority" in body:
            update_fields.append("interest_priority = %(interest_priority)s")
            params["interest_priority"] = body["interest_priority"] if body["interest_priority"] else None
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM health_goal_types WHERE id = %(type_id)s",
                {"type_id": type_id}
            )
            return ApiResponse(success=True, data=existing)
        
        updated_by = current_user.get("name", "") if current_user else ""
        update_fields.append("updated_by = %(updated_by)s")
        params["updated_by"] = updated_by
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE health_goal_types
            SET {', '.join(update_fields)}
            WHERE id = %(type_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "건강목표 유형을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"건강목표 유형 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{type_id}")
async def delete_health_goal_type(
    type_id: int,
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM health_goal_types WHERE id = %(type_id)s",
            {"type_id": type_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "건강목표 유형을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"건강목표 유형 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/batch-delete")
async def batch_delete_health_goal_types(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    건강목표 유형 일괄 삭제
    """
    try:
        ids = body.get("ids", [])
        
        if not ids:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."}
            )
        
        affected = await execute(
            "DELETE FROM health_goal_types WHERE id = ANY(%(ids)s::int[])",
            {"ids": ids}
        )
        
        return ApiResponse(success=True, data={"deleted_count": affected})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"건강목표 유형 일괄 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

