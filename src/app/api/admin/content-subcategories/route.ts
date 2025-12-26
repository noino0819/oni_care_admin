// ============================================
// 중분류 카테고리 등록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// POST: 중분류 카테고리 등록
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
    const { category_id, subcategory_name, display_order, is_active } = body;

    if (!category_id || !subcategory_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '대분류와 중분류명을 입력해주세요.' } },
        { status: 400 }
      );
    }

    const result = await appQuery<{ id: number }>(
      `INSERT INTO content_subcategories (category_id, subcategory_name, display_order, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        category_id,
        subcategory_name.trim(),
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

