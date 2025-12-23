// ============================================
// 시스템 환경설정 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { SystemSetting, ApiResponse } from '@/types';

// GET - 환경설정 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<SystemSetting>(
      `SELECT * FROM public.system_settings WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '환경설정을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<SystemSetting>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('환경설정 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '환경설정 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 환경설정 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { setting_key, setting_name, setting_value, description, is_active } = body;

    if (!setting_key || !setting_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '환경변수키와 환경변수명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.system_settings 
      SET 
        setting_key = $1,
        setting_name = $2,
        setting_value = $3,
        description = $4,
        is_active = $5,
        updated_by = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await queryOne<SystemSetting>(updateQuery, [
      setting_key,
      setting_name,
      setting_value || null,
      description || null,
      is_active ?? true,
      'admin', // TODO: 실제 로그인한 사용자 ID로 변경
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '환경설정을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<SystemSetting>>({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('환경설정 수정 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 환경변수키입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '환경설정 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 환경설정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await queryOne<{ id: number }>(
      `DELETE FROM public.system_settings WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '환경설정을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch (error) {
    console.error('환경설정 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '환경설정 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}



