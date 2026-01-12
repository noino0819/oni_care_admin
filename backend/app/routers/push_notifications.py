# ============================================
# PUSH 알림 관리 API 라우터
# ============================================
# PUSH 알림 CRUD (App DB 사용 - oni_care DB)

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/push-notifications", tags=["Push Notifications"])


@router.get("")
async def get_push_notifications(
    push_name: Optional[str] = Query(None, description="푸시명"),
    target_audience: Optional[str] = Query(None, description="전송대상 (all,normal,affiliate,fs 쉼표구분)"),
    send_to_store: Optional[str] = Query(None, description="스토어 전송여부 (Y,N 쉼표구분)"),
    is_active: Optional[str] = Query(None, description="사용여부 (Y,N 쉼표구분)"),
    send_type: Optional[str] = Query(None, description="발송유형 (time_select,condition,system_time 쉼표구분)"),
    send_type_detail: Optional[str] = Query(None, description="세부유형"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        # 푸시명 검색 (포함)
        if push_name:
            conditions.append("push_name ILIKE %(push_name)s")
            params["push_name"] = f"%{push_name}%"
        
        # 전송대상 필터 (다중 선택 - 배열 교집합)
        if target_audience:
            audiences = [a.strip() for a in target_audience.split(",") if a.strip()]
            if audiences:
                conditions.append("target_audience && %(target_audience)s")
                params["target_audience"] = audiences
        
        # 스토어 전송여부 필터
        if send_to_store:
            store_values = [v.strip().upper() for v in send_to_store.split(",") if v.strip()]
            bool_values = []
            for v in store_values:
                if v == "Y":
                    bool_values.append(True)
                elif v == "N":
                    bool_values.append(False)
            if bool_values:
                conditions.append("send_to_store = ANY(%(send_to_store_values)s)")
                params["send_to_store_values"] = bool_values
        
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
        
        # 발송유형 필터
        if send_type:
            types = [t.strip() for t in send_type.split(",") if t.strip()]
            if types:
                conditions.append("send_type = ANY(%(send_types)s)")
                params["send_types"] = types
        
        # 세부유형 필터
        if send_type_detail:
            conditions.append("send_type_detail = %(send_type_detail)s")
            params["send_type_detail"] = send_type_detail
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["id", "push_name", "send_type", "send_type_detail", "is_active", "created_at", "updated_at"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM push_notifications {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        push_list = await query(
            f"""
            SELECT id, push_name, target_audience, target_companies, send_to_store,
                   send_type, send_type_detail, send_time, content, link_url,
                   is_active, created_at, updated_at
            FROM push_notifications
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        return {
            "success": True,
            "data": push_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"PUSH 알림 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/send-type-details")
async def get_send_type_details(
    send_type: str = Query(..., description="발송유형 (time_select, condition, system_time)"),
    current_user=Depends(get_current_user)
):
    """
    발송유형별 세부설정 옵션 조회
    """
    try:
        # 시간선택
        if send_type == "time_select":
            return ApiResponse(success=True, data=[
                {"value": "breakfast_default", "label": "아침 (9:00)"},
                {"value": "lunch_default", "label": "점심 (12:00)"},
                {"value": "dinner_default", "label": "저녁 (18:00)"},
                {"value": "challenge_auth_time", "label": "챌린지 인증시간 (시작)"},
            ])
        
        # 조건 달성 시
        elif send_type == "condition":
            return ApiResponse(success=True, data=[
                {"value": "meal_record_0", "label": "식사기록 횟수 0회 (21:00)"},
                {"value": "supplement_routine_fail", "label": "영양제 루틴 미달성 시 (21:00)"},
                {"value": "challenge_created", "label": "챌린지 생성 (노출 시작 일자 9:00)"},
                {"value": "challenge_rate_30", "label": "챌린지 달성률 30% 미만"},
                {"value": "steps_30", "label": "오늘 걸음 수 30% 미만"},
                {"value": "steps_goal_achieved", "label": "걸음수 목표달성 시"},
                {"value": "nutrition_diagnosis_none", "label": "영양진단 여부 (미시행)"},
                {"value": "content_created", "label": "컨텐츠 생성 (노출 시작 일자 9:00)"},
            ])
        
        # 시스템 시간
        elif send_type == "system_time":
            return ApiResponse(success=True, data=[
                {"value": "system_default", "label": "시스템 시간"},
            ])
        
        else:
            return ApiResponse(success=True, data=[])
            
    except Exception as e:
        logger.error(f"세부유형 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/companies")
async def get_target_companies(
    search: Optional[str] = Query(None, description="검색어 (기업/사업장명 또는 코드)"),
    current_user=Depends(get_current_user)
):
    """
    전송대상 세부설정용 기업/사업장 목록 조회
    """
    try:
        conditions = ["is_active = true"]
        params = {}
        
        if search:
            conditions.append("(company_name ILIKE %(search)s OR company_code ILIKE %(search)s)")
            params["search"] = f"%{search}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}"
        
        companies = await query(
            f"""
            SELECT id, company_code, company_name
            FROM companies
            {where_clause}
            ORDER BY company_name
            LIMIT 100
            """,
            params,
            use_app_db=True
        )
        
        return ApiResponse(success=True, data=companies)
    except Exception as e:
        logger.error(f"기업 목록 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{push_id}")
async def get_push_notification(
    push_id: str,
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 상세 조회
    """
    try:
        push = await query_one(
            """
            SELECT id, push_name, target_audience, target_companies, send_to_store,
                   send_type, send_type_detail, send_time, content, link_url,
                   is_active, created_by, updated_by, created_at, updated_at
            FROM push_notifications
            WHERE id = %(push_id)s
            """,
            {"push_id": push_id},
            use_app_db=True
        )
        
        if not push:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "푸시 알림을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=push)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUSH 알림 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=http_status.HTTP_201_CREATED)
async def create_push_notification(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 등록
    """
    try:
        push_name = body.get("push_name")
        target_audience = body.get("target_audience", ["all"])
        target_companies = body.get("target_companies", [])
        send_to_store = body.get("send_to_store", False)
        send_type = body.get("send_type")
        send_type_detail = body.get("send_type_detail")
        send_time = body.get("send_time")
        content = body.get("content")
        link_url = body.get("link_url")
        is_active = body.get("is_active", True)
        
        # 필수 필드 검증
        if not push_name or not push_name.strip():
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "푸시명을 입력해주세요."}
            )
        
        if len(push_name.strip()) > 30:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "푸시명은 30자 이내로 입력해주세요."}
            )
        
        if not send_type:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "발송유형을 선택해주세요."}
            )
        
        valid_send_types = ["time_select", "condition_met", "system_time"]
        if send_type not in valid_send_types:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 발송유형입니다."}
            )
        
        if content and len(content.strip()) > 50:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "내용은 50자 이내로 입력해주세요."}
            )
        
        # target_companies는 최대 20개
        if len(target_companies) > 20:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "최대 20개 지점까지 선택 가능합니다."}
            )
        
        created_by = current_user.name if current_user else ""
        
        result = await execute_returning(
            """
            INSERT INTO push_notifications (
                push_name, target_audience, target_companies, send_to_store,
                send_type, send_type_detail, send_time, content, link_url,
                is_active, created_by, updated_by
            )
            VALUES (
                %(push_name)s, %(target_audience)s, %(target_companies)s, %(send_to_store)s,
                %(send_type)s, %(send_type_detail)s, %(send_time)s, %(content)s, %(link_url)s,
                %(is_active)s, %(created_by)s, %(created_by)s
            )
            RETURNING id
            """,
            {
                "push_name": push_name.strip(),
                "target_audience": target_audience,
                "target_companies": target_companies,
                "send_to_store": send_to_store,
                "send_type": send_type,
                "send_type_detail": send_type_detail,
                "send_time": send_time,
                "content": content.strip() if content else None,
                "link_url": link_url.strip() if link_url else None,
                "is_active": is_active,
                "created_by": created_by
            },
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"id": result.get("id")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUSH 알림 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{push_id}")
async def update_push_notification(
    push_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 수정
    """
    try:
        update_fields = []
        params = {"push_id": push_id}
        
        # 업데이트 가능한 필드들
        if "push_name" in body:
            push_name = body["push_name"]
            if push_name and len(push_name.strip()) > 30:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "푸시명은 30자 이내로 입력해주세요."}
                )
            update_fields.append("push_name = %(push_name)s")
            params["push_name"] = push_name.strip() if push_name else None
        
        if "target_audience" in body:
            update_fields.append("target_audience = %(target_audience)s")
            params["target_audience"] = body["target_audience"]
        
        if "target_companies" in body:
            target_companies = body["target_companies"]
            if len(target_companies) > 20:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "최대 20개 지점까지 선택 가능합니다."}
                )
            update_fields.append("target_companies = %(target_companies)s")
            params["target_companies"] = target_companies
        
        if "send_to_store" in body:
            update_fields.append("send_to_store = %(send_to_store)s")
            params["send_to_store"] = body["send_to_store"]
        
        if "send_type" in body:
            send_type = body["send_type"]
            valid_send_types = ["time_select", "condition_met", "system_time"]
            if send_type and send_type not in valid_send_types:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 발송유형입니다."}
                )
            update_fields.append("send_type = %(send_type)s")
            params["send_type"] = send_type
        
        if "send_type_detail" in body:
            update_fields.append("send_type_detail = %(send_type_detail)s")
            params["send_type_detail"] = body["send_type_detail"]
        
        if "send_time" in body:
            update_fields.append("send_time = %(send_time)s")
            params["send_time"] = body["send_time"]
        
        if "content" in body:
            content = body["content"]
            if content and len(content.strip()) > 50:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail={"error": "VALIDATION_ERROR", "message": "내용은 50자 이내로 입력해주세요."}
                )
            update_fields.append("content = %(content)s")
            params["content"] = content.strip() if content else None
        
        if "link_url" in body:
            update_fields.append("link_url = %(link_url)s")
            params["link_url"] = body["link_url"].strip() if body["link_url"] else None
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM push_notifications WHERE id = %(push_id)s",
                {"push_id": push_id},
                use_app_db=True
            )
            return ApiResponse(success=True, data=existing)
        
        updated_by = current_user.name if current_user else ""
        update_fields.append("updated_by = %(updated_by)s")
        params["updated_by"] = updated_by
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE push_notifications
            SET {', '.join(update_fields)}
            WHERE id = %(push_id)s
            RETURNING *
            """,
            params,
            use_app_db=True
        )
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "푸시 알림을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUSH 알림 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{push_id}")
async def delete_push_notification(
    push_id: str,
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM push_notifications WHERE id = %(push_id)s",
            {"push_id": push_id},
            use_app_db=True
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "푸시 알림을 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUSH 알림 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/batch-delete")
async def batch_delete_push_notifications(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    PUSH 알림 일괄 삭제
    """
    try:
        ids = body.get("ids", [])
        
        if not ids:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "삭제할 항목을 선택해주세요."}
            )
        
        affected = await execute(
            "DELETE FROM push_notifications WHERE id = ANY(%(ids)s::uuid[])",
            {"ids": ids},
            use_app_db=True
        )
        
        return ApiResponse(success=True, data={"deleted_count": affected})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PUSH 알림 일괄 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

