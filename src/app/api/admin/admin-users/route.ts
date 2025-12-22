// ============================================
// 관리자 회원 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { AdminUserAccount, ApiResponse, PaginationInfo } from '@/types';
import crypto from 'crypto';

// 비밀번호 해시 함수
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - 관리자 회원 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || '';
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

    if (companyId) {
      conditions.push(`au.company_id = $${paramIndex}`);
      params.push(parseInt(companyId));
      paramIndex++;
    }

    if (companyName) {
      conditions.push(`c.company_name ILIKE $${paramIndex}`);
      params.push(`%${companyName}%`);
      paramIndex++;
    }

    if (departmentName) {
      conditions.push(`d.department_name ILIKE $${paramIndex}`);
      params.push(`%${departmentName}%`);
      paramIndex++;
    }

    if (employeeName) {
      conditions.push(`au.employee_name ILIKE $${paramIndex}`);
      params.push(`%${employeeName}%`);
      paramIndex++;
    }

    if (loginId) {
      conditions.push(`au.login_id ILIKE $${paramIndex}`);
      params.push(`%${loginId}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.admin_users au
      LEFT JOIN public.companies c ON au.company_id = c.id
      LEFT JOIN public.departments d ON au.department_id = d.id
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        au.id, au.login_id, au.employee_name, 
        au.department_id, d.department_name,
        au.company_id, c.company_name,
        au.phone, au.is_active, au.status,
        au.created_by, au.created_at, au.updated_by, au.updated_at
      FROM public.admin_users au
      LEFT JOIN public.companies c ON au.company_id = c.id
      LEFT JOIN public.departments d ON au.department_id = d.id
      ${whereClause}
      ORDER BY au.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<AdminUserAccount>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<AdminUserAccount[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('관리자 회원 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '관리자 회원 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 관리자 회원 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login_id, password, employee_name, department_id, company_id, phone, is_active } = body;

    if (!login_id || !employee_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '로그인 ID와 직원명은 필수입니다.' },
      }, { status: 400 });
    }

    // 기본 비밀번호 설정 (입력값 없으면 login_id + "1234")
    const passwordHash = hashPassword(password || `${login_id}1234`);

    const insertQuery = `
      INSERT INTO public.admin_users 
        (login_id, password_hash, employee_name, department_id, company_id, phone, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, login_id, employee_name, department_id, company_id, phone, is_active, status, created_by, created_at, updated_by, updated_at
    `;

    const result = await queryOne<AdminUserAccount>(insertQuery, [
      login_id,
      passwordHash,
      employee_name,
      department_id || null,
      company_id || null,
      phone || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<AdminUserAccount>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('관리자 회원 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 로그인 ID입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '관리자 회원 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


