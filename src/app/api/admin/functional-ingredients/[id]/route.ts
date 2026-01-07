// ============================================
// 기능성 성분 상세 API (조회/수정/삭제)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 특정 기능성 성분 상세 조회
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

    const { id } = await params;

    const ingredient = await appQueryOne<{
      id: number;
      ingredient_code: string | null;
      internal_name: string;
      external_name: string;
      indicator_component: string | null;
      daily_intake_unit: string | null;
      daily_intake_min: number | null;
      daily_intake_max: number | null;
      display_functionality: string | null;
      is_active: boolean;
      priority_display: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
        id, ingredient_code, internal_name, external_name,
        indicator_component, daily_intake_unit, daily_intake_min,
        daily_intake_max, display_functionality, is_active,
        COALESCE(priority_display, false) as priority_display,
        COALESCE(display_order, 999) as display_order,
        created_at, updated_at
       FROM public.functional_ingredients
       WHERE id = $1`,
      [parseInt(id)]
    );

    if (!ingredient) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '기능성 성분을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredient GET Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT: 특정 기능성 성분 수정
export async function PUT(
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

    const { id } = await params;
    const body = await request.json();
    const {
      internal_name,
      external_name,
      indicator_component,
      daily_intake_min,
      daily_intake_max,
      daily_intake_unit,
      display_functionality,
      is_active,
      priority_display,
      display_order,
    } = body;

    if (!internal_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 성분명(내부)을 입력해주세요.' } },
        { status: 400 }
      );
    }

    if (!external_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 성분명(외부)을 입력해주세요.' } },
        { status: 400 }
      );
    }

    const adminName = payload.name || payload.email || 'admin';

    const result = await appQueryOne<{ id: number }>(
      `UPDATE public.functional_ingredients SET
        internal_name = $1,
        external_name = $2,
        indicator_component = $3,
        daily_intake_min = $4,
        daily_intake_max = $5,
        daily_intake_unit = $6,
        display_functionality = $7,
        is_active = $8,
        priority_display = $9,
        display_order = $10,
        updated_by = $11,
        updated_at = NOW()
       WHERE id = $12
       RETURNING id`,
      [
        internal_name.trim(),
        external_name.trim(),
        indicator_component || null,
        daily_intake_min || null,
        daily_intake_max || null,
        daily_intake_unit || 'mg',
        display_functionality || null,
        is_active ?? true,
        priority_display ?? false,
        display_order || 999,
        adminName,
        parseInt(id),
      ]
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '기능성 성분을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredient PUT Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 특정 기능성 성분 삭제
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

    const { id } = await params;

    // CASCADE 삭제 (관련 매핑 데이터도 함께 삭제됨)
    const result = await appQueryOne<{ id: number }>(
      `DELETE FROM public.functional_ingredients WHERE id = $1 RETURNING id`,
      [parseInt(id)]
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '기능성 성분을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredient DELETE Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

