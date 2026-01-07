// ============================================
// 단위 마스터 API (목록 조회)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db'; // admin DB에서 조회
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 단위 목록 조회 (카테고리별)
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
    const categoryName = searchParams.get('category'); // 제품형태 or 용량/섭취량 단위

    // 동적 쿼리 빌드
    let whereClause = 'WHERE um.is_active = true AND uc.is_active = true';
    const params: string[] = [];

    if (categoryName) {
      whereClause += ' AND um.unit_category_name = $1';
      params.push(categoryName);
    }

    // 단위 목록 조회 (카테고리 포함)
    const units = await query<{
      id: number;
      master_id: number;
      unit_category_name: string;
      unit_value: string;
      unit_name: string;
      description: string | null;
      sort_order: number;
    }>(
      `SELECT 
        uc.id,
        uc.master_id,
        um.unit_category_name,
        uc.unit_value,
        uc.unit_name,
        uc.description,
        uc.sort_order
       FROM public.unit_codes uc
       JOIN public.unit_master um ON uc.master_id = um.id
       ${whereClause}
       ORDER BY um.id ASC, uc.sort_order ASC`,
      params
    );

    // 카테고리별로 그룹화
    const grouped: Record<string, typeof units> = {};
    units.forEach((unit) => {
      if (!grouped[unit.unit_category_name]) {
        grouped[unit.unit_category_name] = [];
      }
      grouped[unit.unit_category_name].push(unit);
    });

    return NextResponse.json({
      success: true,
      data: categoryName ? units : grouped,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Units GET Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

