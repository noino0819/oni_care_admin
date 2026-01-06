"""
파일: app/routers/challenges.py
설명: 챌린지 관리 API 라우터
"""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, Request

from app.models.challenge import (
    ChallengeCreateRequest,
    ChallengeUpdateRequest,
    ChallengeListItem,
    QuizCreateRequest,
    QuizUpdateRequest,
)
from app.services.challenge_service import ChallengeService, QuizService

router = APIRouter(
    prefix="/api/v1/challenges",
    tags=["챌린지 관리"]
)


# ============================================
# 챌린지 관리 API
# ============================================

@router.get("", summary="챌린지 목록 조회")
async def get_challenges(
    title: Optional[str] = Query(None, description="챌린지명 검색"),
    challenge_type: Optional[str] = Query(None, description="챌린지 유형"),
    verification_method: Optional[str] = Query(None, description="인증 방식"),
    visibility_scope: Optional[str] = Query(None, description="공개범위 (쉼표 구분)"),
    status: Optional[str] = Query(None, description="상태 (쉼표 구분)"),
    operation_from: Optional[date] = Query(None, description="운영 시작일 필터"),
    operation_to: Optional[date] = Query(None, description="운영 종료일 필터"),
    recruitment_from: Optional[date] = Query(None, description="모집 시작일 필터"),
    recruitment_to: Optional[date] = Query(None, description="모집 종료일 필터"),
    display_from: Optional[date] = Query(None, description="노출 시작일 필터"),
    display_to: Optional[date] = Query(None, description="노출 종료일 필터"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 개수"),
    service: ChallengeService = Depends()
):
    """챌린지 목록을 조회합니다."""
    # 쉼표 구분 파라미터 파싱
    visibility_list = visibility_scope.split(",") if visibility_scope else None
    status_list = status.split(",") if status else None
    
    result = await service.get_challenges(
        title=title,
        challenge_type=challenge_type,
        verification_method=verification_method,
        visibility_scope=visibility_list,
        status=status_list,
        operation_from=operation_from,
        operation_to=operation_to,
        recruitment_from=recruitment_from,
        recruitment_to=recruitment_to,
        display_from=display_from,
        display_to=display_to,
        page=page,
        limit=limit
    )
    return result


@router.get("/{challenge_id}", summary="챌린지 상세 조회")
async def get_challenge_detail(
    challenge_id: str,
    service: ChallengeService = Depends()
):
    """챌린지 상세 정보를 조회합니다."""
    return await service.get_challenge_by_id(challenge_id)


@router.post("", summary="챌린지 생성", status_code=201)
async def create_challenge(
    request: Request,
    data: ChallengeCreateRequest,
    service: ChallengeService = Depends()
):
    """새 챌린지를 생성합니다."""
    user = getattr(request.state, "user", None)
    created_by = user.get("admin_user_id") if user else "system"
    
    return await service.create_challenge(
        data=data.model_dump(exclude_unset=True),
        created_by=str(created_by)
    )


@router.put("/{challenge_id}", summary="챌린지 수정")
async def update_challenge(
    request: Request,
    challenge_id: str,
    data: ChallengeUpdateRequest,
    service: ChallengeService = Depends()
):
    """챌린지를 수정합니다."""
    user = getattr(request.state, "user", None)
    updated_by = user.get("admin_user_id") if user else "system"
    
    return await service.update_challenge(
        challenge_id=challenge_id,
        data=data.model_dump(exclude_unset=True),
        updated_by=str(updated_by)
    )


@router.delete("", summary="챌린지 삭제")
async def delete_challenges(
    request: Request,
    challenge_ids: List[str] = Query(..., description="삭제할 챌린지 ID 목록"),
    service: ChallengeService = Depends()
):
    """챌린지를 삭제합니다."""
    user = getattr(request.state, "user", None)
    deleted_by = user.get("admin_user_id") if user else "system"
    
    deleted_count = await service.delete_challenges(
        challenge_ids=challenge_ids,
        deleted_by=str(deleted_by)
    )
    return {"message": f"{deleted_count}개의 챌린지가 삭제되었습니다.", "count": deleted_count}


# ============================================
# 퀴즈 관리 API
# ============================================

@router.get("/quizzes/list", summary="퀴즈 목록 조회")
async def get_quizzes(
    quiz_name: Optional[str] = Query(None, description="퀴즈 이름 검색"),
    quiz_type: Optional[str] = Query(None, description="퀴즈 유형 (multiple_choice, ox)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 개수"),
    service: QuizService = Depends()
):
    """퀴즈 목록을 조회합니다."""
    return await service.get_quizzes(
        quiz_name=quiz_name,
        quiz_type=quiz_type,
        page=page,
        limit=limit
    )


@router.get("/quizzes/{quiz_id}", summary="퀴즈 상세 조회")
async def get_quiz_detail(
    quiz_id: str,
    service: QuizService = Depends()
):
    """퀴즈 상세 정보를 조회합니다."""
    return await service.get_quiz_by_id(quiz_id)


@router.post("/quizzes", summary="퀴즈 생성", status_code=201)
async def create_quiz(
    request: Request,
    data: QuizCreateRequest,
    service: QuizService = Depends()
):
    """새 퀴즈를 생성합니다."""
    user = getattr(request.state, "user", None)
    created_by = user.get("admin_user_id") if user else "system"
    
    return await service.create_quiz(
        data=data.model_dump(exclude_unset=True),
        created_by=str(created_by)
    )


@router.put("/quizzes/{quiz_id}", summary="퀴즈 수정")
async def update_quiz(
    request: Request,
    quiz_id: str,
    data: QuizUpdateRequest,
    service: QuizService = Depends()
):
    """퀴즈를 수정합니다."""
    user = getattr(request.state, "user", None)
    updated_by = user.get("admin_user_id") if user else "system"
    
    return await service.update_quiz(
        quiz_id=quiz_id,
        data=data.model_dump(exclude_unset=True),
        updated_by=str(updated_by)
    )


@router.delete("/quizzes", summary="퀴즈 삭제")
async def delete_quizzes(
    request: Request,
    quiz_ids: List[str] = Query(..., description="삭제할 퀴즈 ID 목록"),
    service: QuizService = Depends()
):
    """퀴즈를 삭제합니다."""
    user = getattr(request.state, "user", None)
    deleted_by = user.get("admin_user_id") if user else "system"
    
    deleted_count = await service.delete_quizzes(
        quiz_ids=quiz_ids,
        deleted_by=str(deleted_by)
    )
    return {"message": f"{deleted_count}개의 퀴즈가 삭제되었습니다.", "count": deleted_count}


# ============================================
# 챌린지-퀴즈 연결 API
# ============================================

@router.get("/{challenge_id}/quizzes", summary="챌린지 퀴즈 목록 조회")
async def get_challenge_quizzes(
    challenge_id: str,
    service: QuizService = Depends()
):
    """챌린지에 연결된 퀴즈 목록을 조회합니다."""
    return await service.get_challenge_quizzes(challenge_id)


@router.post("/{challenge_id}/quizzes/{quiz_id}", summary="챌린지에 퀴즈 추가", status_code=201)
async def add_quiz_to_challenge(
    challenge_id: str,
    quiz_id: str,
    display_order: Optional[int] = Query(None, description="표시 순서"),
    service: QuizService = Depends()
):
    """챌린지에 퀴즈를 추가합니다."""
    return await service.add_quiz_to_challenge(
        challenge_id=challenge_id,
        quiz_id=quiz_id,
        display_order=display_order
    )


@router.delete("/{challenge_id}/quizzes/{quiz_id}", summary="챌린지에서 퀴즈 제거")
async def remove_quiz_from_challenge(
    challenge_id: str,
    quiz_id: str,
    service: QuizService = Depends()
):
    """챌린지에서 퀴즈를 제거합니다."""
    result = await service.remove_quiz_from_challenge(
        challenge_id=challenge_id,
        quiz_id=quiz_id
    )
    return {"message": "퀴즈가 챌린지에서 제거되었습니다.", "success": result}


# ============================================
# 퀴즈 챌린지 관리 API (퀴즈 관리 화면용)
# ============================================

@router.get("/quiz-management/challenges", summary="퀴즈 관리용 챌린지 목록 조회")
async def get_quiz_management_challenges(
    title: Optional[str] = Query(None, description="챌린지명 검색"),
    visibility_scope: Optional[str] = Query(None, description="공개범위 (쉼표 구분)"),
    status: Optional[str] = Query(None, description="상태 (쉼표 구분)"),
    operation_from: Optional[date] = Query(None, description="운영 시작일 필터"),
    operation_to: Optional[date] = Query(None, description="운영 종료일 필터"),
    recruitment_from: Optional[date] = Query(None, description="모집 시작일 필터"),
    recruitment_to: Optional[date] = Query(None, description="모집 종료일 필터"),
    display_from: Optional[date] = Query(None, description="노출 시작일 필터"),
    display_to: Optional[date] = Query(None, description="노출 종료일 필터"),
    service: QuizService = Depends()
):
    """퀴즈 관리 화면용 챌린지 목록을 조회합니다."""
    visibility_list = visibility_scope.split(",") if visibility_scope else None
    status_list = status.split(",") if status else None
    
    return await service.get_quiz_challenges(
        title=title,
        visibility_scope=visibility_list,
        status=status_list,
        operation_from=operation_from,
        operation_to=operation_to,
        recruitment_from=recruitment_from,
        recruitment_to=recruitment_to,
        display_from=display_from,
        display_to=display_to
    )

