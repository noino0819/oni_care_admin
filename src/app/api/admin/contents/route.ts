// ============================================
// 컨텐츠 목록 조회/등록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 컨텐츠 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const offset = (page - 1) * pageSize;

    // 필터 조건
    const title = searchParams.get('title');
    const categoryId = searchParams.get('category_id');
    const updatedFrom = searchParams.get('updated_from');
    const updatedTo = searchParams.get('updated_to');
    const sortField = searchParams.get('sort_field') || 'updated_at';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    // 동적 쿼리 빌드
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (title) {
      conditions.push(`c.title ILIKE $${paramIndex}`);
      params.push(`%${title}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`c.category_id = $${paramIndex}`);
      params.push(parseInt(categoryId));
      paramIndex++;
    }

    if (updatedFrom) {
      conditions.push(`c.updated_at >= $${paramIndex}`);
      params.push(updatedFrom);
      paramIndex++;
    }

    if (updatedTo) {
      conditions.push(`c.updated_at <= $${paramIndex}`);
      params.push(updatedTo + ' 23:59:59');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 정렬 필드 검증
    const allowedSortFields = ['title', 'updated_at', 'created_at', 'start_date'];
    const safeField = allowedSortFields.includes(sortField) ? `c.${sortField}` : 'c.updated_at';
    const safeDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // 전체 개수 조회
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.contents c ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 컨텐츠 목록 조회
    const contents = await query<{
      id: string;
      title: string;
      category_id: number | null;
      category_name: string | null;
      tags: string[];
      visibility_scope: string[];
      start_date: string | null;
      end_date: string | null;
      updated_at: string;
      updated_by: string | null;
      has_quote: boolean;
      quote_content: string | null;
    }>(
      `SELECT 
        c.id, c.title, c.category_id, cat.category_name,
        COALESCE(c.tags, '{}') as tags, 
        COALESCE(c.visibility_scope, '{all}') as visibility_scope, 
        c.start_date, c.end_date, c.updated_at, c.updated_by,
        COALESCE(c.has_quote, false) as has_quote, c.quote_content
       FROM public.contents c
       LEFT JOIN public.content_categories cat ON c.category_id = cat.id
       ${whereClause}
       ORDER BY ${safeField} ${safeDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    // 결과 포맷팅
    const formattedContents = contents.map((content) => ({
      ...content,
      category_names: content.category_name ? [content.category_name] : [],
      has_quote: content.has_quote || !!content.quote_content,
    }));

    return NextResponse.json({
      success: true,
      data: formattedContents,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    // 개발 환경에서 에러 상세 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('[Contents API Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 컨텐츠 등록
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      category_id,
      tags,
      visibility_scope,
      company_codes,
      store_visible,
      start_date,
      end_date,
      has_quote,
      quote_content,
      quote_source,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요.' } },
        { status: 400 }
      );
    }

    // 컨텐츠 등록
    const result = await query<{ id: string }>(
      `INSERT INTO public.contents (
        title, content, category_id, tags, visibility_scope, company_codes,
        store_visible, start_date, end_date, has_quote, quote_content, quote_source,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING id`,
      [
        title.trim(),
        content || null,
        category_id || null,
        tags || [],
        visibility_scope || ['all'],
        company_codes || [],
        store_visible || false,
        start_date || null,
        end_date || null,
        has_quote || false,
        quote_content || null,
        quote_source || null,
        payload.name || payload.email || 'admin',
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result[0]?.id },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Contents POST Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
