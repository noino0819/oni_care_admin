// ============================================
// 컨텐츠 상세/수정/삭제 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
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

    // 컨텐츠 조회
    const content = await appQuery<{
      id: string;
      title: string;
      content: string | null;
      thumbnail_url: string | null;
      tags: string[];
      visibility_scope: string[];
      company_codes: string[];
      store_visible: boolean;
      start_date: string | null;
      end_date: string | null;
      has_quote: boolean;
      quote_content: string | null;
      quote_source: string | null;
      created_at: string;
      updated_at: string;
      updated_by: string | null;
      category_id: number | null;
      subcategory_id: number | null;
    }>(
      `SELECT 
        id, title, content, thumbnail_url, tags, visibility_scope, company_codes,
        store_visible, start_date, end_date, 
        COALESCE(has_quote, false) as has_quote, quote_content, quote_source,
        created_at, updated_at, updated_by, category_id, subcategory_id
       FROM contents
       WHERE id = $1`,
      [id]
    );

    if (content.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '컨텐츠를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 카테고리 정보 조회
    const categories = await appQuery<{ category_id: number; category_name: string }>(
      `SELECT ccm.category_id, cat.category_name
       FROM content_category_mapping ccm
       JOIN content_categories cat ON ccm.category_id = cat.id
       WHERE ccm.content_id = $1
       UNION
       SELECT c.category_id, cat.category_name
       FROM contents c
       JOIN content_categories cat ON c.category_id = cat.id
       WHERE c.id = $1 AND c.category_id IS NOT NULL`,
      [id]
    );

    // 미디어 조회
    const media = await appQuery<{ id: string; media_url: string; display_order: number }>(
      `SELECT id, media_url, display_order
       FROM content_media
       WHERE content_id = $1
       ORDER BY display_order`,
      [id]
    );

    const contentData = content[0];
    return NextResponse.json({
      success: true,
      data: {
        ...contentData,
        is_store_visible: contentData.store_visible,
        category_ids: categories.map(c => c.category_id),
        category_names: categories.map(c => c.category_name),
        images: media,
      },
    });
  } catch {
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
    const {
      title,
      content,
      category_ids,
      tags,
      visibility_scope,
      company_codes,
      is_store_visible,
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

    // 컨텐츠 수정
    await appQuery(
      `UPDATE contents SET
        title = $1, content = $2, tags = $3, visibility_scope = $4, company_codes = $5,
        store_visible = $6, start_date = $7, end_date = $8, has_quote = $9, 
        quote_content = $10, quote_source = $11, updated_by = $12, updated_at = NOW()
       WHERE id = $13`,
      [
        title.trim(),
        content || null,
        tags || [],
        visibility_scope || ['all'],
        company_codes || [],
        is_store_visible || false,
        start_date || null,
        end_date || null,
        has_quote || false,
        quote_content || null,
        quote_source || null,
        payload.name || payload.email || 'admin',
        id,
      ]
    );

    // 기존 카테고리 매핑 삭제 후 재등록
    await appQuery(`DELETE FROM content_category_mapping WHERE content_id = $1`, [id]);
    
    if (category_ids && category_ids.length > 0) {
      for (const catId of category_ids) {
        await appQuery(
          `INSERT INTO content_category_mapping (content_id, category_id) VALUES ($1, $2)
           ON CONFLICT (content_id, category_id) DO NOTHING`,
          [id, catId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch {
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

    await appQuery(`DELETE FROM contents WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

