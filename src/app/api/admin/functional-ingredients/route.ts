// ============================================
// 기능성 성분 관리 API (목록 조회/등록)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, withAppTransaction } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 기능성 성분 목록 조회
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
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const offset = (page - 1) * pageSize;

    // 필터 조건
    const ingredientCode = searchParams.get('ingredient_code');
    const internalName = searchParams.get('internal_name');
    const externalName = searchParams.get('external_name');
    const indicatorComponent = searchParams.get('indicator_component');
    const functionality = searchParams.get('functionality');
    const functionalityCode = searchParams.get('functionality_code');
    const priorityDisplay = searchParams.get('priority_display');
    const searchTerm = searchParams.get('search'); // 통합 검색용

    // 동적 쿼리 빌드
    const conditions: string[] = ['fi.is_active = true'];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (ingredientCode) {
      conditions.push(`fi.ingredient_code = $${paramIndex}`);
      params.push(ingredientCode);
      paramIndex++;
    }

    if (internalName) {
      conditions.push(`fi.internal_name ILIKE $${paramIndex}`);
      params.push(`%${internalName}%`);
      paramIndex++;
    }

    if (externalName) {
      conditions.push(`fi.external_name ILIKE $${paramIndex}`);
      params.push(`%${externalName}%`);
      paramIndex++;
    }

    if (indicatorComponent) {
      conditions.push(`fi.indicator_component ILIKE $${paramIndex}`);
      params.push(`%${indicatorComponent}%`);
      paramIndex++;
    }

    if (functionality) {
      conditions.push(`EXISTS (
        SELECT 1 FROM public.ingredient_functionality_mapping ifm
        JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
        WHERE ifm.ingredient_id = fi.id AND fc.content ILIKE $${paramIndex}
      )`);
      params.push(`%${functionality}%`);
      paramIndex++;
    }

    if (functionalityCode) {
      conditions.push(`EXISTS (
        SELECT 1 FROM public.ingredient_functionality_mapping ifm
        JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
        WHERE ifm.ingredient_id = fi.id AND fc.functionality_code = $${paramIndex}
      )`);
      params.push(functionalityCode);
      paramIndex++;
    }

    // 통합 검색 (성분명 내부/외부/지표성분)
    if (searchTerm) {
      conditions.push(`(
        fi.internal_name ILIKE $${paramIndex} OR 
        fi.external_name ILIKE $${paramIndex} OR 
        fi.indicator_component ILIKE $${paramIndex}
      )`);
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 전체 개수 조회
    const countResult = await appQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.functional_ingredients fi ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 기능성 성분 목록 조회 (우선 노출 순서 반영)
    const ingredients = await appQuery<{
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
        fi.id, fi.ingredient_code, fi.internal_name, fi.external_name,
        fi.indicator_component, fi.daily_intake_unit, fi.daily_intake_min,
        fi.daily_intake_max, fi.display_functionality, fi.is_active,
        COALESCE(fi.priority_display, false) as priority_display,
        COALESCE(fi.display_order, 999) as display_order,
        fi.created_at, fi.updated_at
       FROM public.functional_ingredients fi
       ${whereClause}
       ORDER BY 
        CASE WHEN fi.priority_display = true THEN 0 ELSE 1 END,
        fi.display_order ASC,
        fi.internal_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: ingredients,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredients API Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 기능성 성분 등록
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
    const {
      internal_name,
      external_name,
      indicator_component,
      daily_intake_min,
      daily_intake_max,
      daily_intake_unit,
      display_functionality,
      is_active = true,
      priority_display = false,
    } = body;

    if (!internal_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 성분명(내부)을 입력해주세요.' } },
        { status: 400 }
      );
    }

    if (internal_name.trim().length > 30) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 성분명(내부)은 30자 이내로 입력해주세요.' } },
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

    // 기능성 성분 등록 (코드는 시퀀스로 자동 생성)
    const result = await appQuery<{ id: number }>(
      `INSERT INTO public.functional_ingredients (
        ingredient_code, internal_name, external_name, indicator_component,
        daily_intake_min, daily_intake_max, daily_intake_unit,
        display_functionality, is_active, priority_display,
        created_by, updated_by
      ) VALUES (
        LPAD(nextval('functional_ingredient_code_seq')::text, 5, '0'),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
      )
      RETURNING id`,
      [
        internal_name.trim(),
        external_name.trim(),
        indicator_component || null,
        daily_intake_min || null,
        daily_intake_max || null,
        daily_intake_unit || 'mg',
        display_functionality || null,
        is_active,
        priority_display,
        adminName,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result[0]?.id },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredients POST Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 기능성 성분 삭제 (다건)
export async function DELETE(request: NextRequest) {
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '삭제할 항목을 선택해주세요.' } },
        { status: 400 }
      );
    }

    // 삭제 (CASCADE로 매핑 데이터도 함께 삭제됨)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await appQuery(
      `DELETE FROM public.functional_ingredients WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({
      success: true,
      data: { deleted: ids.length },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Functional Ingredients DELETE Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

