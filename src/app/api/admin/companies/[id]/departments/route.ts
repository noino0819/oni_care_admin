// ============================================
// 부서 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Department, ApiResponse, PaginationInfo } from '@/types';

// GET - 부서 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code') || '';
    const departmentName = searchParams.get('department_name') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [`company_id = $1`];
    const params_arr: unknown[] = [companyId];
    let paramIndex = 2;

    if (departmentCode) {
      conditions.push(`department_code ILIKE $${paramIndex}`);
      params_arr.push(`%${departmentCode}%`);
      paramIndex++;
    }

    if (departmentName) {
      conditions.push(`department_name ILIKE $${paramIndex}`);
      params_arr.push(`%${departmentName}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.departments 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params_arr);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, company_id, department_code, department_name, note, is_active,
        created_by, created_at, updated_by, updated_at
      FROM public.departments
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<Department>(dataQuery, [...params_arr, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<Department[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('부서 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '부서 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 부서 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await request.json();
    const { department_code, department_name, note, is_active } = body;

    if (!department_code || !department_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '부서코드와 부서명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.departments 
        (company_id, department_code, department_name, note, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await queryOne<Department>(insertQuery, [
      companyId,
      department_code,
      department_name,
      note || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<Department>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('부서 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '해당 회사에 이미 존재하는 부서코드입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '부서 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




