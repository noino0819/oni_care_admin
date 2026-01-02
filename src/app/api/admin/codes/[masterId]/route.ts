// ============================================
// 공통 코드 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { CommonCode, ApiResponse, PaginationInfo } from '@/types';

// GET - 공통 코드 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ masterId: string }> }
) {
  try {
    const { masterId } = await params;
    const { searchParams } = new URL(request.url);
    const codeName = searchParams.get('code_name') || '';
    const isActive = searchParams.get('is_active') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [`master_id = $1`];
    const params_arr: unknown[] = [masterId];
    let paramIndex = 2;

    if (codeName) {
      conditions.push(`(code_name ILIKE $${paramIndex} OR code_value ILIKE $${paramIndex})`);
      params_arr.push(`%${codeName}%`);
      paramIndex++;
    }

    if (isActive === 'Y') {
      conditions.push(`is_active = true`);
    } else if (isActive === 'N') {
      conditions.push(`is_active = false`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.common_codes 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params_arr);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, master_id, code_value, code_name, description, 
        sort_order, extra_field1, extra_field2, extra_field3,
        is_active, created_by, created_at, updated_by, updated_at
      FROM public.common_codes
      ${whereClause}
      ORDER BY sort_order ASC, id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<CommonCode>(dataQuery, [...params_arr, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<CommonCode[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('공통 코드 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '공통 코드 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 공통 코드 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ masterId: string }> }
) {
  try {
    const { masterId } = await params;
    const body = await request.json();
    const { 
      code_value, code_name, description, sort_order,
      extra_field1, extra_field2, extra_field3, is_active 
    } = body;

    if (!code_value || !code_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '공통코드와 코드명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.common_codes 
        (master_id, code_value, code_name, description, sort_order, 
         extra_field1, extra_field2, extra_field3, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await queryOne<CommonCode>(insertQuery, [
      masterId,
      code_value,
      code_name,
      description || null,
      sort_order || 0,
      extra_field1 || null,
      extra_field2 || null,
      extra_field3 || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<CommonCode>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('공통 코드 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '해당 마스터 코드에 이미 존재하는 코드 값입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '공통 코드 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




