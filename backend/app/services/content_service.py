# ============================================
# 컨텐츠 서비스
# ============================================
# 컨텐츠 CRUD

from typing import Optional, List, Dict, Any

from app.config.database import query, query_one, execute_returning, execute
from app.core.exceptions import ValidationError, NotFoundError
from app.core.logger import logger
from app.models.content import ContentCreate, ContentUpdate


class ContentService:
    """컨텐츠 서비스 클래스"""
    
    @classmethod
    async def get_list(
        cls,
        title: Optional[str] = None,
        category_id: Optional[int] = None,
        tag: Optional[str] = None,
        visibility_scope: Optional[List[str]] = None,
        company_code: Optional[str] = None,
        updated_from: Optional[str] = None,
        updated_to: Optional[str] = None,
        start_from: Optional[str] = None,
        start_to: Optional[str] = None,
        has_quote: Optional[str] = None,
        sort_field: str = "updated_at",
        sort_direction: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        컨텐츠 목록 조회
        
        Returns:
            data: 컨텐츠 목록
            pagination: 페이지네이션 정보
        """
        # 조건절 생성
        conditions = []
        params = {}
        
        if title:
            conditions.append("c.title ILIKE %(title)s")
            params["title"] = f"%{title}%"
        
        if category_id:
            conditions.append("c.category_id = %(category_id)s")
            params["category_id"] = category_id
        
        if tag:
            conditions.append("%(tag)s = ANY(c.tags)")
            params["tag"] = tag
        
        if visibility_scope:
            conditions.append("c.visibility_scope && %(visibility_scope)s::text[]")
            params["visibility_scope"] = "{" + ",".join(visibility_scope) + "}"
        
        if company_code:
            conditions.append("%(company_code)s = ANY(c.company_codes)")
            params["company_code"] = company_code
        
        if updated_from:
            conditions.append("c.updated_at >= %(updated_from)s")
            params["updated_from"] = updated_from
        
        if updated_to:
            conditions.append("c.updated_at <= %(updated_to)s")
            params["updated_to"] = updated_to + " 23:59:59"
        
        if start_from:
            conditions.append("c.start_date >= %(start_from)s")
            params["start_from"] = start_from
        
        if start_to:
            conditions.append("c.end_date <= %(start_to)s")
            params["start_to"] = start_to
        
        if has_quote == "Y":
            conditions.append("c.has_quote = true")
        elif has_quote == "N":
            conditions.append("(c.has_quote = false OR c.has_quote IS NULL)")
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 필드 검증
        allowed_sort_fields = ["title", "updated_at", "created_at", "start_date"]
        safe_field = f"c.{sort_field}" if sort_field in allowed_sort_fields else "c.updated_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회
        count_sql = f"SELECT COUNT(*) as count FROM public.contents c {where_clause}"
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset
        
        data_sql = f"""
            SELECT 
                c.id, c.title, c.category_id, cat.category_name,
                c.tags, c.visibility_scope,
                c.start_date, c.end_date, c.updated_at, c.updated_by,
                COALESCE(c.has_quote, false) as has_quote
            FROM public.contents c
            LEFT JOIN public.content_categories cat ON c.category_id = cat.id
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
        """
        
        data = await query(data_sql, params)
        
        # 결과 포맷팅
        formatted_data = []
        for item in data:
            formatted_data.append({
                **item,
                "tags": item.get("tags") or [],
                "visibility_scope": item.get("visibility_scope") or ["all"],
                "category_names": [item["category_name"]] if item.get("category_name") else [],
            })
        
        return {
            "data": formatted_data,
            "pagination": {
                "page": page,
                "limit": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
            }
        }
    
    @classmethod
    async def get_by_id(cls, content_id: str) -> Optional[Dict[str, Any]]:
        """
        ID로 컨텐츠 조회
        
        Args:
            content_id: 컨텐츠 ID (UUID)
        
        Returns:
            컨텐츠 정보 또는 None
        """
        sql = """
            SELECT 
                c.*, cat.category_name,
                COALESCE(
                    (SELECT array_agg(cm.media_url ORDER BY cm.display_order)
                     FROM public.content_media cm
                     WHERE cm.content_id = c.id AND cm.media_type = 'image'),
                    '{}'
                ) as detail_images
            FROM public.contents c
            LEFT JOIN public.content_categories cat ON c.category_id = cat.id
            WHERE c.id = %(content_id)s
        """
        result = await query_one(sql, {"content_id": content_id})
        
        if result:
            result["tags"] = result.get("tags") or []
            result["visibility_scope"] = result.get("visibility_scope") or ["all"]
            result["company_codes"] = result.get("company_codes") or []
            result["detail_images"] = result.get("detail_images") or []
            result["category_names"] = [result["category_name"]] if result.get("category_name") else []
        
        return result
    
    @classmethod
    async def create(cls, data: ContentCreate, created_by: str = "admin") -> Dict[str, Any]:
        """
        컨텐츠 생성
        
        Args:
            data: 생성 데이터
            created_by: 생성자
        
        Returns:
            생성된 컨텐츠 정보
        """
        if not data.title.strip():
            raise ValidationError("제목을 입력해주세요.")
        
        # 첫 번째 카테고리 ID 사용
        category_id = data.category_ids[0] if data.category_ids else None
        
        result = await execute_returning(
            """
            INSERT INTO public.contents (
                title, content, thumbnail_url, category_id, tags, visibility_scope, company_codes,
                store_visible, start_date, end_date, has_quote, quote_content, quote_source,
                created_by, updated_by
            ) VALUES (
                %(title)s, %(content)s, %(thumbnail_url)s, %(category_id)s, %(tags)s,
                %(visibility_scope)s, %(company_codes)s, %(store_visible)s, %(start_date)s,
                %(end_date)s, %(has_quote)s, %(quote_content)s, %(quote_source)s,
                %(created_by)s, %(created_by)s
            )
            RETURNING id
            """,
            {
                "title": data.title.strip(),
                "content": data.content,
                "thumbnail_url": data.thumbnail_url,
                "category_id": category_id,
                "tags": data.tags,
                "visibility_scope": data.visibility_scope,
                "company_codes": data.company_codes,
                "store_visible": data.is_store_visible or data.store_visible,
                "start_date": data.start_date,
                "end_date": data.end_date,
                "has_quote": data.has_quote,
                "quote_content": data.quote_content,
                "quote_source": data.quote_source,
                "created_by": created_by,
            }
        )
        
        content_id = result.get("id")
        
        # 상세 이미지 저장
        if content_id and data.detail_images:
            for i, image_url in enumerate(data.detail_images):
                await execute(
                    """
                    INSERT INTO public.content_media (content_id, media_type, media_url, display_order)
                    VALUES (%(content_id)s, 'image', %(media_url)s, %(display_order)s)
                    """,
                    {
                        "content_id": content_id,
                        "media_url": image_url,
                        "display_order": i + 1
                    }
                )
        
        logger.info(f"컨텐츠 생성: id={content_id}")
        return {"id": str(content_id)}
    
    @classmethod
    async def update(cls, content_id: str, data: ContentUpdate, updated_by: str = "admin") -> Optional[Dict[str, Any]]:
        """
        컨텐츠 수정
        
        Args:
            content_id: 컨텐츠 ID
            data: 수정 데이터
            updated_by: 수정자
        
        Returns:
            수정된 컨텐츠 정보
        """
        # 기존 데이터 확인
        existing = await cls.get_by_id(content_id)
        if not existing:
            raise NotFoundError("컨텐츠를 찾을 수 없습니다.")
        
        # 수정할 필드 구성
        update_fields = []
        params = {"content_id": content_id, "updated_by": updated_by}
        
        if data.title is not None:
            update_fields.append("title = %(title)s")
            params["title"] = data.title.strip()
        
        if data.content is not None:
            update_fields.append("content = %(content)s")
            params["content"] = data.content
        
        if data.thumbnail_url is not None:
            update_fields.append("thumbnail_url = %(thumbnail_url)s")
            params["thumbnail_url"] = data.thumbnail_url
        
        if data.category_id is not None or data.category_ids:
            category_id = data.category_id or (data.category_ids[0] if data.category_ids else None)
            update_fields.append("category_id = %(category_id)s")
            params["category_id"] = category_id
        
        if data.tags is not None:
            update_fields.append("tags = %(tags)s")
            params["tags"] = data.tags
        
        if data.visibility_scope is not None:
            update_fields.append("visibility_scope = %(visibility_scope)s")
            params["visibility_scope"] = data.visibility_scope
        
        if data.company_codes is not None:
            update_fields.append("company_codes = %(company_codes)s")
            params["company_codes"] = data.company_codes
        
        if data.start_date is not None:
            update_fields.append("start_date = %(start_date)s")
            params["start_date"] = data.start_date
        
        if data.end_date is not None:
            update_fields.append("end_date = %(end_date)s")
            params["end_date"] = data.end_date
        
        store_visible = data.store_visible if data.store_visible is not None else data.is_store_visible
        if store_visible is not None:
            update_fields.append("store_visible = %(store_visible)s")
            params["store_visible"] = store_visible
        
        if data.has_quote is not None:
            update_fields.append("has_quote = %(has_quote)s")
            params["has_quote"] = data.has_quote
        
        if data.quote_content is not None:
            update_fields.append("quote_content = %(quote_content)s")
            params["quote_content"] = data.quote_content
        
        if data.quote_source is not None:
            update_fields.append("quote_source = %(quote_source)s")
            params["quote_source"] = data.quote_source
        
        if not update_fields:
            return existing
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        sql = f"""
            UPDATE public.contents
            SET {', '.join(update_fields)}
            WHERE id = %(content_id)s
            RETURNING id
        """
        
        await execute_returning(sql, params)
        
        # 상세 이미지 업데이트
        if data.detail_images is not None:
            # 기존 이미지 삭제
            await execute(
                "DELETE FROM public.content_media WHERE content_id = %(content_id)s AND media_type = 'image'",
                {"content_id": content_id}
            )
            
            # 새 이미지 추가
            for i, image_url in enumerate(data.detail_images):
                await execute(
                    """
                    INSERT INTO public.content_media (content_id, media_type, media_url, display_order)
                    VALUES (%(content_id)s, 'image', %(media_url)s, %(display_order)s)
                    """,
                    {
                        "content_id": content_id,
                        "media_url": image_url,
                        "display_order": i + 1
                    }
                )
        
        logger.info(f"컨텐츠 수정: id={content_id}")
        return await cls.get_by_id(content_id)
    
    @classmethod
    async def delete(cls, content_id: str) -> bool:
        """
        컨텐츠 삭제
        
        Args:
            content_id: 컨텐츠 ID
        
        Returns:
            삭제 성공 여부
        """
        affected = await execute(
            "DELETE FROM public.contents WHERE id = %(content_id)s",
            {"content_id": content_id}
        )
        
        if affected > 0:
            logger.info(f"컨텐츠 삭제: id={content_id}")
            return True
        return False
    
    @classmethod
    async def batch_delete(cls, content_ids: List[str]) -> int:
        """
        컨텐츠 일괄 삭제
        
        Args:
            content_ids: 삭제할 컨텐츠 ID 목록
        
        Returns:
            삭제된 개수
        """
        if not content_ids:
            return 0
        
        # UUID 배열로 변환
        affected = await execute(
            "DELETE FROM public.contents WHERE id = ANY(%(ids)s::uuid[])",
            {"ids": content_ids}
        )
        
        logger.info(f"컨텐츠 일괄 삭제: {affected}건")
        return affected

