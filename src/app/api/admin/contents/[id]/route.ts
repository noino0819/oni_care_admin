// ============================================
// 컨텐츠 상세/수정/삭제 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 컨텐츠 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // 컨텐츠 조회 - 기본 컬럼만 사용
    const contentData = await queryOne<{
      id: string;
      title: string;
      content: string | null;
      category_id: number | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, content, category_id, created_at, updated_at
       FROM public.contents
       WHERE id = $1`,
      [id]
    );

    if (!contentData) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '컨텐츠를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 카테고리 이름 조회
    let categoryName = null;
    if (contentData.category_id) {
      const cat = await queryOne<{ category_name: string }>(
        `SELECT category_name FROM public.content_categories WHERE id = $1`,
        [contentData.category_id]
      );
      categoryName = cat?.category_name || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...contentData,
        category_ids: contentData.category_id ? [contentData.category_id] : [],
        category_names: categoryName ? [categoryName] : [],
        // 기본값 설정
        tags: [],
        visibility_scope: ['all'],
        company_codes: [],
        is_store_visible: false,
        start_date: null,
        end_date: null,
        has_quote: false,
        quote_content: null,
        quote_source: null,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Contents Detail API Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT: 컨텐츠 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    const { title, content, category_ids } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요.' } },
        { status: 400 }
      );
    }

    // 첫 번째 카테고리 ID 사용 (단일 카테고리)
    const categoryId = category_ids && category_ids.length > 0 ? category_ids[0] : null;

    // 컨텐츠 수정 - 기본 컬럼만 사용
    await query(
      `UPDATE public.contents SET
        title = $1, content = $2, category_id = $3, updated_at = NOW()
       WHERE id = $4`,
      [title.trim(), content || null, categoryId, id]
    );

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Contents PUT Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 컨텐츠 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    await query(`DELETE FROM public.contents WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Contents DELETE Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
