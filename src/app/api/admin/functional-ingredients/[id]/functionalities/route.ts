// ============================================
// 기능성 성분에 매핑된 기능성 내용 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 특정 기능성 성분에 매핑된 기능성 내용 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: ingredientId } = await params;

    const functionalities = await appQuery<{
      mapping_id: number;
      functionality_id: number;
      functionality_code: string;
      content: string;
      description: string | null;
      display_order: number;
    }>(
      `SELECT 
        ifm.id as mapping_id,
        fc.id as functionality_id,
        fc.functionality_code,
        fc.content,
        fc.description,
        ifm.display_order
       FROM public.ingredient_functionality_mapping ifm
       JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
       WHERE ifm.ingredient_id = $1 AND fc.is_active = true
       ORDER BY ifm.display_order ASC`,
      [parseInt(ingredientId)]
    );

    return NextResponse.json({
      success: true,
      data: functionalities,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Ingredient Functionalities GET Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 특정 기능성 성분에 기능성 내용 매핑 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: ingredientId } = await params;
    const body = await request.json();
    const { functionality_ids, display_order = 0 } = body;

    if (!functionality_ids || !Array.isArray(functionality_ids) || functionality_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 내용을 선택해주세요.' } },
        { status: 400 }
      );
    }

    // 기존 매핑 삭제 후 새로 추가 (UPSERT)
    const insertedIds: number[] = [];
    
    for (let i = 0; i < functionality_ids.length; i++) {
      const functionalityId = functionality_ids[i];
      const result = await appQueryOne<{ id: number }>(
        `INSERT INTO public.ingredient_functionality_mapping (ingredient_id, functionality_id, display_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (ingredient_id, functionality_id) DO UPDATE SET display_order = EXCLUDED.display_order
         RETURNING id`,
        [parseInt(ingredientId), functionalityId, i]
      );
      if (result) {
        insertedIds.push(result.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: { added: insertedIds.length },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Ingredient Functionalities POST Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 특정 기능성 성분에서 기능성 내용 매핑 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: ingredientId } = await params;
    const body = await request.json();
    const { functionality_ids } = body;

    if (!functionality_ids || !Array.isArray(functionality_ids) || functionality_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '삭제할 기능성 내용을 선택해주세요.' } },
        { status: 400 }
      );
    }

    const placeholders = functionality_ids.map((_, i) => `$${i + 2}`).join(',');
    await appQuery(
      `DELETE FROM public.ingredient_functionality_mapping 
       WHERE ingredient_id = $1 AND functionality_id IN (${placeholders})`,
      [parseInt(ingredientId), ...functionality_ids]
    );

    return NextResponse.json({
      success: true,
      data: { deleted: functionality_ids.length },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Ingredient Functionalities DELETE Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

