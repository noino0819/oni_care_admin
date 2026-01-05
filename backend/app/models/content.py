# ============================================
# 컨텐츠 관련 모델
# ============================================

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, datetime


class ContentBase(BaseModel):
    """컨텐츠 기본 모델"""
    title: str = Field(..., min_length=1, description="제목")
    content: Optional[str] = Field(None, description="본문")
    thumbnail_url: Optional[str] = Field(None, description="썸네일 URL")
    category_id: Optional[int] = Field(None, description="카테고리 ID")
    tags: List[str] = Field(default_factory=list, description="태그 목록")
    visibility_scope: List[str] = Field(default_factory=lambda: ['all'], description="공개범위")
    company_codes: List[str] = Field(default_factory=list, description="기업코드 목록")
    start_date: Optional[date] = Field(None, description="게시 시작일")
    end_date: Optional[date] = Field(None, description="게시 종료일")
    store_visible: bool = Field(False, description="스토어 노출 여부")
    has_quote: bool = Field(False, description="명언 포함 여부")
    quote_content: Optional[str] = Field(None, description="명언 내용")
    quote_source: Optional[str] = Field(None, description="명언 출처")


class ContentCreate(ContentBase):
    """컨텐츠 생성 모델"""
    category_ids: List[int] = Field(default_factory=list, description="카테고리 ID 목록")
    detail_images: List[str] = Field(default_factory=list, description="상세 이미지 URL 목록")
    is_store_visible: bool = Field(False, description="스토어 노출 여부")


class ContentUpdate(BaseModel):
    """컨텐츠 수정 모델"""
    title: Optional[str] = None
    content: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category_id: Optional[int] = None
    category_ids: List[int] = Field(default_factory=list)
    tags: Optional[List[str]] = None
    visibility_scope: Optional[List[str]] = None
    company_codes: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    store_visible: Optional[bool] = None
    is_store_visible: Optional[bool] = None
    has_quote: Optional[bool] = None
    quote_content: Optional[str] = None
    quote_source: Optional[str] = None
    detail_images: Optional[List[str]] = None


class ContentResponse(BaseModel):
    """컨텐츠 응답 모델"""
    id: str
    title: str
    content: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_names: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    visibility_scope: List[str] = Field(default_factory=lambda: ['all'])
    company_codes: List[str] = Field(default_factory=list)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    store_visible: bool = False
    has_quote: bool = False
    quote_content: Optional[str] = None
    quote_source: Optional[str] = None
    view_count: int = 0
    like_count: int = 0
    is_published: bool = False
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ContentListParams(BaseModel):
    """컨텐츠 목록 조회 파라미터"""
    title: Optional[str] = None
    category_id: Optional[int] = None
    tag: Optional[str] = None
    visibility_scope: Optional[str] = None
    company_code: Optional[str] = None
    updated_from: Optional[str] = None
    updated_to: Optional[str] = None
    start_from: Optional[str] = None
    start_to: Optional[str] = None
    has_quote: Optional[str] = None
    sort_field: str = Field('updated_at', description="정렬 필드")
    sort_direction: str = Field('desc', description="정렬 방향")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class BatchDeleteRequest(BaseModel):
    """일괄 삭제 요청"""
    ids: List[str] = Field(..., min_length=1, description="삭제할 ID 목록")


