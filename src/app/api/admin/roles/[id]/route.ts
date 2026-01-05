// ============================================
// 역할 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Role, ApiResponse } from '@/types';

// GET - 역할 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await queryOne<Role>(
      `SELECT * FROM public.roles WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '역할을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Role>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('역할 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '역할 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 역할 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_name, description, is_active } = body;

    if (!role_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '역할명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.roles
      SET role_name = $1, description = $2, is_active = $3, updated_by = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await queryOne<Role>(updateQuery, [
      role_name,
      description || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '역할을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Role>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('역할 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '역할 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 역할 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 해당 역할에 매핑된 사용자가 있는지 확인
    const userCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.admin_user_roles WHERE role_id = $1`,
      [id]
    );

    if (parseInt(userCount?.count || '0') > 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'CONSTRAINT_ERROR', message: '해당 역할에 매핑된 사용자가 있어 삭제할 수 없습니다.' },
      }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM public.roles WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '역할을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('역할 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '역할 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





