// ============================================
// 보안 그룹 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { SecurityGroup, ApiResponse } from '@/types';

// GET - 보안그룹 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dataQuery = `
      SELECT 
        id, group_name, description, is_active,
        created_by, created_at, updated_by, updated_at
      FROM public.security_groups
      WHERE id = $1
    `;
    
    const data = await queryOne<SecurityGroup>(dataQuery, [id]);

    if (!data) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '보안그룹을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<SecurityGroup>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('보안그룹 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '보안그룹 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 보안그룹 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { group_name, description, is_active } = body;

    if (!group_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '보안그룹명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.security_groups
      SET 
        group_name = $1,
        description = $2,
        is_active = $3,
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await queryOne<SecurityGroup>(updateQuery, [
      group_name,
      description || null,
      is_active ?? true,
      'admin',
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '보안그룹을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<SecurityGroup>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('보안그룹 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '보안그룹 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 보안그룹 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleteQuery = `
      DELETE FROM public.security_groups
      WHERE id = $1
      RETURNING id
    `;

    const result = await queryOne<{ id: string }>(deleteQuery, [id]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '보안그룹을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('보안그룹 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '보안그룹 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

