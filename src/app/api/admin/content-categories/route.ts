// ============================================
// 컨텐츠 카테고리 목록 조회/등록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 카테고리 목록 조회 (대분류 + 중분류)
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

    const categoryName = searchParams.get('category_name');
    const subcategoryName = searchParams.get('subcategory_name');
    const isActive = searchParams.get('is_active');
    const sortField = searchParams.get('sort_field') || 'display_order';
    const sortDirection = searchParams.get('sort_direction') || 'asc';

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
    
    // 정렬 필드 검증
    const allowedSortFields = ['category_type', 'category_name', 'display_order', 'updated_at'];
    const safeField = allowedSortFields.includes(sortField) ? sortField : 'display_order';
    const safeDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // 전체 대분류 개수 조회
    const countResult = await appQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_categories ${catWhereClause}`,
      catParams
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 대분류 목록 조회
    const categories = await appQuery<{
      id: number;
      category_type: string;
      category_name: string;
      subcategory_types: string | null;
      display_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, category_type, category_name, subcategory_types, display_order, 
              is_active, created_at, updated_at
       FROM content_categories
       ${catWhereClause}
       ORDER BY ${safeField} ${safeDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...catParams, pageSize, offset]
    );

    // 중분류 조회 조건
    const subConditions: string[] = [];
    const subParams: (string | number)[] = [];
    let subParamIndex = 1;

    if (subcategoryName) {
      subConditions.push(`subcategory_name ILIKE $${subParamIndex}`);
      subParams.push(`%${subcategoryName}%`);
      subParamIndex++;
    }

    if (isActive === 'Y') {
      subConditions.push(`is_active = true`);
    } else if (isActive === 'N') {
      subConditions.push(`is_active = false`);
    }

    // 대분류 ID 목록으로 필터링
    if (categories.length > 0) {
      const catIds = categories.map(c => c.id);
      const catIdPlaceholders = catIds.map((_, i) => `$${subParamIndex + i}`).join(', ');
      subConditions.push(`category_id IN (${catIdPlaceholders})`);
      subParams.push(...catIds);
    }

    const subWhereClause = subConditions.length > 0 ? `WHERE ${subConditions.join(' AND ')}` : '';

    // 중분류 목록 조회
    const subcategories = await appQuery<{
      id: number;
      category_id: number;
      subcategory_name: string;
      display_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, category_id, subcategory_name, display_order, 
              is_active, created_at, updated_at
       FROM content_subcategories
       ${subWhereClause}
       ORDER BY display_order ASC`,
      subParams
    );

    return NextResponse.json({
      success: true,
      data: {
        categories,
        subcategories,
      },
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch {
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

    if (!category_type?.trim() || !category_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '카테고리 유형과 이름을 입력해주세요.' } },
        { status: 400 }
      );
    }

    const result = await appQuery<{ id: number }>(
      `INSERT INTO content_categories (category_type, category_name, subcategory_types, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        category_type.trim(),
        category_name.trim(),
        subcategory_types || null,
        display_order || 0,
        is_active !== false,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result[0]?.id },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

