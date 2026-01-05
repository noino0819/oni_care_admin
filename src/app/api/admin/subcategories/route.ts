// ============================================
// 중분류 카테고리 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// 중분류 목록 조회
export async function GET(req: NextRequest) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const subcategoryName = searchParams.get('subcategory_name');
    const isActive = searchParams.get('is_active');
    const categoryId = searchParams.get('category_id');

    // 동적 쿼리 빌드
    const conditions: string[] = [];
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (subcategoryName) {
      conditions.push(`s.subcategory_name ILIKE $${paramIndex}`);
      params.push(`%${subcategoryName}%`);
      paramIndex++;
    }
    if (isActive !== null && isActive !== '') {
      conditions.push(`s.is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }
    if (categoryId) {
      conditions.push(`s.category_id = $${paramIndex}`);
      params.push(parseInt(categoryId));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const data = await appQuery<{
      id: number;
      category_id: number;
      category_name: string;
      category_type: string;
      subcategory_name: string;
      display_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT s.*, c.category_name, c.category_type
       FROM content_subcategories s
       JOIN content_categories c ON c.id = s.category_id
       ${whereClause}
       ORDER BY s.display_order ASC`,
      params
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('중분류 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 중분류 등록
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category_id, subcategory_name, display_order, is_active } = body;

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: { message: '대분류를 선택해주세요.' } },
        { status: 400 }
      );
    }

    if (!subcategory_name) {
      return NextResponse.json(
        { success: false, error: { message: '중분류명은 필수입니다.' } },
        { status: 400 }
      );
    }

    const result = await appQueryOne<{ id: number }>(
      `INSERT INTO content_subcategories (category_id, subcategory_name, display_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [category_id, subcategory_name, display_order || 1, is_active ?? true]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('중분류 등록 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
