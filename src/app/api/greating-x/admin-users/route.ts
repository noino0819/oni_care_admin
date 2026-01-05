// ============================================
// 그리팅-X 관리자 회원 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { GreatingXAdminUser, ApiResponse, PaginationInfo } from '@/types';
import crypto from 'crypto';

// 비밀번호 해시 함수
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - 그리팅-X 관리자 회원 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('company_name') || '';
    const departmentName = searchParams.get('department_name') || '';
    const employeeName = searchParams.get('employee_name') || '';
    const loginId = searchParams.get('login_id') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (companyName) {
      conditions.push(`c.company_name ILIKE $${paramIndex}`);
      params.push(`%${companyName}%`);
      paramIndex++;
    }

    if (departmentName) {
      conditions.push(`gxau.department_name ILIKE $${paramIndex}`);
      params.push(`%${departmentName}%`);
      paramIndex++;
    }

    if (employeeName) {
      conditions.push(`gxau.employee_name ILIKE $${paramIndex}`);
      params.push(`%${employeeName}%`);
      paramIndex++;
    }

    if (loginId) {
      conditions.push(`gxau.login_id ILIKE $${paramIndex}`);
      params.push(`%${loginId}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.greating_x_admin_users gxau
      LEFT JOIN public.companies c ON gxau.company_id = c.id
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        gxau.id, gxau.login_id, gxau.employee_name, 
        gxau.department_name,
        gxau.company_id, c.company_name,
        gxau.phone, gxau.is_active, gxau.status,
        gxau.created_by, gxau.created_at, gxau.updated_by, gxau.updated_at
      FROM public.greating_x_admin_users gxau
      LEFT JOIN public.companies c ON gxau.company_id = c.id
      ${whereClause}
      ORDER BY gxau.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<GreatingXAdminUser>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<GreatingXAdminUser[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('그리팅-X 관리자 회원 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '관리자 회원 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 그리팅-X 관리자 회원 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login_id, password, employee_name, department_name, company_id, phone, is_active } = body;

    if (!login_id || !employee_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '사번과 직원명은 필수입니다.' },
      }, { status: 400 });
    }

    // 기본 비밀번호 설정 (입력값 없으면 login_id + "1234")
    const passwordHash = hashPassword(password || `${login_id}1234`);

    const insertQuery = `
      INSERT INTO public.greating_x_admin_users 
        (login_id, password_hash, employee_name, department_name, company_id, phone, is_active, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, login_id, employee_name, department_name, company_id, phone, is_active, status, created_by, created_at, updated_by, updated_at
    `;

    const result = await queryOne<GreatingXAdminUser>(insertQuery, [
      login_id,
      passwordHash,
      employee_name,
      department_name || null,
      company_id || null,
      phone || null,
      is_active ?? true,
      is_active === false ? 0 : 1,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<GreatingXAdminUser>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('그리팅-X 관리자 회원 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 사번입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '관리자 회원 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}



