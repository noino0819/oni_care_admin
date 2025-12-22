// ============================================
// 관리자 회원 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { AdminUserAccount, ApiResponse } from '@/types';

// GET - 관리자 회원 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      WHERE au.id = $1
    `;
    
    const data = await queryOne<AdminUserAccount>(dataQuery, [id]);

    if (!data) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminUserAccount>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('관리자 회원 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '관리자 회원 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 관리자 회원 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { login_id, employee_name, department_id, company_id, phone, is_active } = body;

    if (!login_id || !employee_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '로그인 ID와 직원명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.admin_users
      SET 
        login_id = $1,
        employee_name = $2,
        department_id = $3,
        company_id = $4,
        phone = $5,
        is_active = $6,
        updated_by = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, login_id, employee_name, department_id, company_id, phone, is_active, status, created_by, created_at, updated_by, updated_at
    `;

    const result = await queryOne<AdminUserAccount>(updateQuery, [
      login_id,
      employee_name,
      department_id || null,
      company_id || null,
      phone || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminUserAccount>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('관리자 회원 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '관리자 회원 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 관리자 회원 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleteQuery = `
      DELETE FROM public.admin_users
      WHERE id = $1
      RETURNING id
    `;

    const result = await queryOne<{ id: string }>(deleteQuery, [id]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('관리자 회원 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '관리자 회원 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


