// ============================================
// 회사 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { Company, ApiResponse } from '@/types';

// GET - 회사 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<Company>(
      `SELECT * FROM public.companies WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '회사를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Company>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('회사 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '회사 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 회사 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_code, company_name, note, is_active } = body;

    if (!company_code || !company_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '회사코드와 회사명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.companies 
      SET 
        company_code = $1,
        company_name = $2,
        note = $3,
        is_active = $4,
        updated_by = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await queryOne<Company>(updateQuery, [
      company_code,
      company_name,
      note || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '회사를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Company>>({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('회사 수정 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 회사코드입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '회사 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 회사 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<{ id: number }>(
      `DELETE FROM public.companies WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '회사를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch (error) {
    console.error('회사 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '회사 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


