// ============================================
// 영양제-성분 매핑 API (성분 및 함량)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, withAppTransaction } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 영양제에 매핑된 성분 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 영양제에 매핑된 성분 목록 조회
    const ingredients = await appQuery<{
      mapping_id: number;
      ingredient_id: number;
      ingredient_code: string | null;
      internal_name: string;
      external_name: string;
      indicator_component: string | null;
      content_amount: number;
      content_unit: string;
      display_order: number;
    }>(
      `SELECT 
        pim.id as mapping_id,
        fi.id as ingredient_id,
        fi.ingredient_code,
        fi.internal_name,
        fi.external_name,
        fi.indicator_component,
        pim.content_amount,
        pim.content_unit,
        pim.display_order
       FROM public.product_ingredient_mapping pim
       JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
       WHERE pim.product_id = $1
       ORDER BY pim.display_order ASC, fi.internal_name ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: ingredients,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supplement Ingredients GET Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 성분 매핑 추가/업데이트 (전체 교체 방식)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { ingredients } = body;

    if (!Array.isArray(ingredients)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '성분 목록이 올바르지 않습니다.' } },
        { status: 400 }
      );
    }

    await withAppTransaction(async (client) => {
      // 기존 매핑 삭제
      await client.query(
        `DELETE FROM public.product_ingredient_mapping WHERE product_id = $1`,
        [productId]
      );

      // 새 매핑 추가
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await client.query(
          `INSERT INTO public.product_ingredient_mapping 
           (product_id, ingredient_id, content_amount, content_unit, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, ing.ingredient_id, ing.content_amount || 0, ing.content_unit || 'mg', i]
        );
      }
    });

    return NextResponse.json({
      success: true,
      data: { updated: ingredients.length },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supplement Ingredients POST Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 특정 성분 매핑 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { mapping_ids } = body;

    if (!mapping_ids || !Array.isArray(mapping_ids) || mapping_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '삭제할 항목을 선택해주세요.' } },
        { status: 400 }
      );
    }

    const placeholders = mapping_ids.map((_, i) => `$${i + 2}`).join(',');
    await appQuery(
      `DELETE FROM public.product_ingredient_mapping 
       WHERE product_id = $1 AND id IN (${placeholders})`,
      [productId, ...mapping_ids]
    );

    return NextResponse.json({
      success: true,
      data: { deleted: mapping_ids.length },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Supplement Ingredients DELETE Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

