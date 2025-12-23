// ============================================
// 공통 코드 마스터 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { CommonCodeMaster, ApiResponse, PaginationInfo } from '@/types';

// GET - 마스터 코드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codeName = searchParams.get('code_name') || '';
    const isActive = searchParams.get('is_active') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (codeName) {
      conditions.push(`code_name ILIKE $${paramIndex}`);
      params.push(`%${codeName}%`);
      paramIndex++;
    }

    if (isActive === 'Y') {
      conditions.push(`is_active = true`);
    } else if (isActive === 'N') {
      conditions.push(`is_active = false`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.common_code_master 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, code_name, description, is_active, 
        created_by, created_at, updated_by, updated_at
      FROM public.common_code_master
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<CommonCodeMaster>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<CommonCodeMaster[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('공통 코드 마스터 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '공통 코드 마스터 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 마스터 코드 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code_name, description, is_active } = body;

    if (!code_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '코드명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.common_code_master 
        (code_name, description, is_active, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await queryOne<CommonCodeMaster>(insertQuery, [
      code_name,
      description || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<CommonCodeMaster>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('공통 코드 마스터 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 코드명입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '공통 코드 마스터 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}



