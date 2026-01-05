// ============================================
// 역할 관리 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Role, ApiResponse, PaginationInfo } from '@/types';

// GET - 역할 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get('role_name') || '';
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (roleName) {
      conditions.push(`role_name ILIKE $${paramIndex}`);
      params.push(`%${roleName}%`);
      paramIndex++;
    }

    if (isActive !== null && isActive !== '') {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'Y' || isActive === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `SELECT COUNT(*) as count FROM public.roles ${whereClause}`;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT id, role_code, role_name, description, is_active, 
             created_by, created_at, updated_by, updated_at
      FROM public.roles
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<Role>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<Role[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('역할 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '역할 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 역할 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_name, description, is_active } = body;

    if (!role_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '역할명은 필수입니다.' },
      }, { status: 400 });
    }

    // 역할 코드 생성 (자동 채번: 1001, 1002, ...)
    const maxCodeResult = await queryOne<{ max_code: string | null }>(
      `SELECT MAX(CAST(role_code AS INTEGER)) as max_code FROM public.roles WHERE role_code ~ '^[0-9]+$'`
    );
    const nextCode = (parseInt(maxCodeResult?.max_code || '1000') + 1).toString();

    const insertQuery = `
      INSERT INTO public.roles (role_code, role_name, description, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await queryOne<Role>(insertQuery, [
      nextCode,
      role_name,
      description || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<Role>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('역할 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 역할 코드입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '역할 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




