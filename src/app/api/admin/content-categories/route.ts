// ============================================
// 컨텐츠 카테고리 목록 조회/등록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 카테고리 목록 조회
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
    const pageSize = parseInt(searchParams.get('page_size') || '100');
    const offset = (page - 1) * pageSize;

    const categoryName = searchParams.get('category_name');
    const isActive = searchParams.get('is_active');

    // 대분류 조회 조건
    const catConditions: string[] = [];
    const catParams: (string | number)[] = [];
    let paramIndex = 1;

    if (categoryName) {
      catConditions.push(`category_name ILIKE $${paramIndex}`);
      catParams.push(`%${categoryName}%`);
      paramIndex++;
    }

    if (isActive === 'Y') {
      catConditions.push(`is_active = true`);
    } else if (isActive === 'N') {
      catConditions.push(`is_active = false`);
    }

    const catWhereClause = catConditions.length > 0 ? `WHERE ${catConditions.join(' AND ')}` : '';

    // 전체 대분류 개수 조회
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.content_categories ${catWhereClause}`,
      catParams
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 대분류 목록 조회 - category_type 포함
    const categories = await query<{
      id: number;
      category_type: string;
      category_name: string;
      subcategory_types: string | null;
      display_order: number;
      is_active: boolean;
      created_at: string;
    }>(
      `SELECT id, COALESCE(category_type, '관심사') as category_type, category_name, 
              subcategory_types, COALESCE(display_order, 0) as display_order, 
              is_active, created_at
       FROM public.content_categories
       ${catWhereClause}
       ORDER BY category_type, display_order, id ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...catParams, pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        categories,
        subcategories: [], // 중분류 테이블이 없으면 빈 배열
      },
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
      console.error('[Content Categories API Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 대분류 카테고리 등록
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
    const { category_type, category_name, subcategory_types, display_order, is_active } = body;

    if (!category_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '카테고리 이름을 입력해주세요.' } },
        { status: 400 }
      );
    }

    const result = await query<{ id: number }>(
      `INSERT INTO public.content_categories (category_type, category_name, subcategory_types, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [category_type || '관심사', category_name.trim(), subcategory_types || null, display_order || 0, is_active !== false]
    );

    return NextResponse.json({
      success: true,
      data: { id: result[0]?.id },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Content Categories POST Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
