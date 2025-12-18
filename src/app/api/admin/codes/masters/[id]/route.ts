// ============================================
// 공통 코드 마스터 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { CommonCodeMaster, ApiResponse } from '@/types';

// GET - 마스터 코드 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<CommonCodeMaster>(
      `SELECT * FROM public.common_code_master WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '마스터 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<CommonCodeMaster>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('마스터 코드 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '마스터 코드 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 마스터 코드 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code_name, description, is_active } = body;

    if (!code_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '코드명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.common_code_master 
      SET 
        code_name = $1,
        description = $2,
        is_active = $3,
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await queryOne<CommonCodeMaster>(updateQuery, [
      code_name,
      description || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '마스터 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<CommonCodeMaster>>({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('마스터 코드 수정 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 코드명입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '마스터 코드 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 마스터 코드 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<{ id: number }>(
      `DELETE FROM public.common_code_master WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '마스터 코드를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch (error) {
    console.error('마스터 코드 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '마스터 코드 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

