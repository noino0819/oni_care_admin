// ============================================
// API 마스터 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { AdminApi, ApiResponse } from '@/types';

// GET - API 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await queryOne<AdminApi>(
      `SELECT * FROM public.admin_apis WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminApi>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'API 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - API 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { api_name, api_path, description, is_active } = body;

    if (!api_name || !api_path) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'API명과 API 경로는 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.admin_apis
      SET api_name = $1, api_path = $2, description = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await queryOne<AdminApi>(updateQuery, [
      api_name,
      api_path,
      description || null,
      is_active ?? true,
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminApi>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'API 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - API 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `DELETE FROM public.admin_apis WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'API를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('API 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'API 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


