// ============================================
// 컨텐츠 카테고리 단순 목록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 대분류 카테고리 전체 목록 (페이지네이션 없음)
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

    // 활성화된 대분류 목록만 조회
    const categories = await appQuery<{
      id: number;
      category_type: string;
      category_name: string;
      display_order: number;
    }>(
      `SELECT id, category_type, category_name, display_order
       FROM content_categories
       WHERE is_active = true
       ORDER BY display_order ASC, category_name ASC`
    );

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

