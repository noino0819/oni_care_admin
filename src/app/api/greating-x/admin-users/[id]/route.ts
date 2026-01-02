// ============================================
// 그리팅-X 관리자 회원 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { GreatingXAdminUser, ApiResponse } from '@/types';
import crypto from 'crypto';

// 비밀번호 해시 함수
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - 그리팅-X 관리자 회원 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dataQuery = `
      SELECT 
        gxau.id, gxau.login_id, gxau.employee_name, 
        gxau.department_name,
        gxau.company_id, c.company_name,
        gxau.phone, gxau.is_active, gxau.status,
        gxau.created_by, gxau.created_at, gxau.updated_by, gxau.updated_at
      FROM public.greating_x_admin_users gxau
      LEFT JOIN public.companies c ON gxau.company_id = c.id
      WHERE gxau.id = $1
    `;
    
    const data = await queryOne<GreatingXAdminUser>(dataQuery, [id]);

    if (!data) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<GreatingXAdminUser>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('그리팅-X 관리자 회원 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '관리자 회원 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 그리팅-X 관리자 회원 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { login_id, employee_name, department_name, company_id, phone, is_active } = body;

    if (!login_id || !employee_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '사번과 직원명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.greating_x_admin_users
      SET 
        login_id = $1,
        employee_name = $2,
        department_name = $3,
        company_id = $4,
        phone = $5,
        is_active = $6,
        status = $7,
        updated_by = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING id, login_id, employee_name, department_name, company_id, phone, is_active, status, created_by, created_at, updated_by, updated_at
    `;

    const result = await queryOne<GreatingXAdminUser>(updateQuery, [
      login_id,
      employee_name,
      department_name || null,
      company_id || null,
      phone || null,
      is_active ?? true,
      is_active === false ? 0 : 1,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<GreatingXAdminUser>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('그리팅-X 관리자 회원 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '관리자 회원 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 그리팅-X 관리자 회원 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleteQuery = `
      DELETE FROM public.greating_x_admin_users
      WHERE id = $1
      RETURNING id
    `;

    const result = await queryOne<{ id: number }>(deleteQuery, [id]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('그리팅-X 관리자 회원 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '관리자 회원 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


