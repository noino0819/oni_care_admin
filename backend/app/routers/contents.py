# ============================================
# 컨텐츠 API 라우터
# ============================================
# 컨텐츠 CRUD

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.services.content_service import ContentService
from app.models.content import ContentCreate, ContentUpdate, BatchDeleteRequest
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.exceptions import AppException
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/contents", tags=["Contents"])


@router.get("")
async def get_contents(
    title: Optional[str] = Query(None, description="제목 검색"),
    category_id: Optional[int] = Query(None, description="카테고리 ID"),
    tag: Optional[str] = Query(None, description="태그"),
    visibility_scope: Optional[str] = Query(None, description="공개범위 (쉼표 구분)"),
    company_code: Optional[str] = Query(None, description="기업코드"),
    updated_from: Optional[str] = Query(None, description="수정일 시작"),
    updated_to: Optional[str] = Query(None, description="수정일 종료"),
    start_from: Optional[str] = Query(None, description="게시 시작일 시작"),
    start_to: Optional[str] = Query(None, description="게시 종료일 종료"),
    has_quote: Optional[str] = Query(None, description="명언 여부 (Y/N)"),
    sort_field: str = Query("updated_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 목록 조회
    """
    try:
        # visibility_scope 파싱
        scope_list = None
        if visibility_scope:
            scope_list = [s.strip() for s in visibility_scope.split(",") if s.strip()]
        
        result = await ContentService.get_list(
            title=title,
            category_id=category_id,
            tag=tag,
            visibility_scope=scope_list,
            company_code=company_code,
            updated_from=updated_from,
            updated_to=updated_to,
            start_from=start_from,
            start_to=start_to,
            has_quote=has_quote,
            sort_field=sort_field,
            sort_direction=sort_direction,
            page=page,
            page_size=page_size
        )
        
        return {
            "success": True,
            "data": result["data"],
            "pagination": result["pagination"]
        }
    except Exception as e:
        logger.error(f"컨텐츠 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{content_id}")
async def get_content(
    content_id: str,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 상세 조회
    """
    try:
        content = await ContentService.get_by_id(content_id)
        
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "컨텐츠를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_content(
    body: ContentCreate,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 등록
    """
    try:
        result = await ContentService.create(
            data=body,
            created_by=current_user.name
        )
        
        return ApiResponse(success=True, data=result)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"컨텐츠 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.put("/{content_id}")
async def update_content(
    content_id: str,
    body: ContentUpdate,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 수정
    """
    try:
        result = await ContentService.update(
            content_id=content_id,
            data=body,
            updated_by=current_user.name
        )
        
        return ApiResponse(success=True, data=result)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except Exception as e:
        logger.error(f"컨텐츠 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 삭제
    """
    try:
        success = await ContentService.delete(content_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "컨텐츠를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"컨텐츠 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.post("/batch-delete")
async def batch_delete_contents(
    body: BatchDeleteRequest,
    current_user=Depends(get_current_user)
):
    """
    컨텐츠 일괄 삭제
    """
    try:
        deleted_count = await ContentService.batch_delete(body.ids)
        
        return ApiResponse(
            success=True, 
            data={"deleted_count": deleted_count, "message": f"{deleted_count}건이 삭제되었습니다."}
        )
    except Exception as e:
        logger.error(f"컨텐츠 일괄 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

