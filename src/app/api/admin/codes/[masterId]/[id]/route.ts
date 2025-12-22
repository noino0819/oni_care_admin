// ============================================
// 공통 코드 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { CommonCode, ApiResponse } from '@/types';

// GET - 공통 코드 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ masterId: string; id: string }> }
) {
  try {
    const { masterId, id } = await params;
    
    const result = await queryOne<CommonCode>(
      `SELECT * FROM public.common_codes WHERE id = $1 AND master_id = $2`,
      [id, masterId]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '공통 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<CommonCode>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('공통 코드 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '공통 코드 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 공통 코드 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ masterId: string; id: string }> }
) {
  try {
    const { masterId, id } = await params;
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

    const updateQuery = `
      UPDATE public.common_codes 
      SET 
        code_value = $1,
        code_name = $2,
        description = $3,
        sort_order = $4,
        extra_field1 = $5,
        extra_field2 = $6,
        extra_field3 = $7,
        is_active = $8,
        updated_by = $9,
        updated_at = NOW()
      WHERE id = $10 AND master_id = $11
      RETURNING *
    `;

    const result = await queryOne<CommonCode>(updateQuery, [
      code_value,
      code_name,
      description || null,
      sort_order || 0,
      extra_field1 || null,
      extra_field2 || null,
      extra_field3 || null,
      is_active ?? true,
      'admin',
      id,
      masterId,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '공통 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<CommonCode>>({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('공통 코드 수정 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '해당 마스터 코드에 이미 존재하는 코드 값입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '공통 코드 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 공통 코드 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ masterId: string; id: string }> }
) {
  try {
    const { masterId, id } = await params;
    
    const result = await queryOne<{ id: number }>(
      `DELETE FROM public.common_codes WHERE id = $1 AND master_id = $2 RETURNING id`,
      [id, masterId]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '공통 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch (error) {
    console.error('공통 코드 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '공통 코드 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


