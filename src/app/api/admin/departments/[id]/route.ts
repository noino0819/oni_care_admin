// ============================================
// 부서 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { Department, ApiResponse } from '@/types';

// PUT - 부서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { department_code, department_name, note, is_active } = body;

    if (!department_code || !department_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '부서코드와 부서명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.departments 
      SET 
        department_code = $1,
        department_name = $2,
        note = $3,
        is_active = $4,
        updated_by = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await queryOne<Department>(updateQuery, [
      department_code,
      department_name,
      note || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '부서를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Department>>({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('부서 수정 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '해당 회사에 이미 존재하는 부서코드입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '부서 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 부서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<{ id: number }>(
      `DELETE FROM public.departments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '부서를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch (error) {
    console.error('부서 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '부서 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}



