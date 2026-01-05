-- ============================================
-- 컨텐츠 관련 SQL
-- ============================================

-- query_name: count_contents
-- 컨텐츠 수 조회
SELECT COUNT(*) as count
FROM public.contents c
{where_clause};

-- query_name: list_contents
-- 컨텐츠 목록 조회
SELECT 
    c.id, c.title, c.category_id, cat.category_name,
    c.tags, c.visibility_scope,
    c.start_date, c.end_date, c.updated_at, c.updated_by,
    COALESCE(c.has_quote, false) as has_quote
FROM public.contents c
LEFT JOIN public.content_categories cat ON c.category_id = cat.id
{where_clause}
ORDER BY {order_by}
LIMIT %(limit)s OFFSET %(offset)s;

-- query_name: get_content_by_id
-- ID로 컨텐츠 조회
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
WHERE c.id = %(content_id)s;

-- query_name: insert_content
-- 컨텐츠 등록
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
RETURNING id;

-- query_name: insert_content_media
-- 컨텐츠 미디어 등록
INSERT INTO public.content_media (content_id, media_type, media_url, display_order)
VALUES (%(content_id)s, 'image', %(media_url)s, %(display_order)s);

-- query_name: delete_content_media
-- 컨텐츠 미디어 삭제
DELETE FROM public.content_media 
WHERE content_id = %(content_id)s AND media_type = 'image';

-- query_name: delete_content
-- 컨텐츠 삭제
DELETE FROM public.contents WHERE id = %(content_id)s;

-- query_name: batch_delete_contents
-- 컨텐츠 일괄 삭제
DELETE FROM public.contents WHERE id = ANY(%(ids)s::uuid[]);


