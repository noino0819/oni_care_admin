// ============================================
// 영양제의 기능성 내용 조회 API (읽기 전용)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 영양제에 매핑된 성분들의 기능성 내용 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId } = await params;

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

    // 영양제에 매핑된 성분들의 기능성 내용 조회
    // 성분을 통해 연결된 기능성 내용과 해당 성분명을 함께 반환
    const functionalities = await appQuery<{
      functionality_id: number;
      functionality_code: string;
      content: string;
      ingredient_names: string[];
    }>(
      `SELECT 
        fc.id as functionality_id,
        fc.functionality_code,
        fc.content,
        array_agg(DISTINCT fi.internal_name) as ingredient_names
       FROM public.product_ingredient_mapping pim
       JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
       JOIN public.ingredient_functionality_mapping ifm ON fi.id = ifm.ingredient_id
       JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
       WHERE pim.product_id = $1 AND fc.is_active = true
       GROUP BY fc.id, fc.functionality_code, fc.content
       ORDER BY fc.functionality_code ASC`,
      [productId]
    );

    return NextResponse.json({
      success: true,
      data: functionalities,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supplement Functionalities GET Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

