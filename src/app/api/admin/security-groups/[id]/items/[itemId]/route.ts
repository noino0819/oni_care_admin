// ============================================
// 보안 그룹 항목 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { SecurityGroupItem, ApiResponse } from '@/types';

// PUT - 보안그룹 항목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { entry_path, company_code, company_name, is_active } = body;

    const updateQuery = `
      UPDATE public.security_group_items
      SET 
        entry_path = $1,
        company_code = $2,
        company_name = $3,
        is_active = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await queryOne<SecurityGroupItem>(updateQuery, [
      entry_path || null,
      company_code || null,
      company_name || null,
      is_active ?? true,
      itemId,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '보안그룹 항목을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<SecurityGroupItem>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('보안그룹 항목 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '보안그룹 항목 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 보안그룹 항목 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const deleteQuery = `
      DELETE FROM public.security_group_items
      WHERE id = $1
      RETURNING id
    `;

    const result = await queryOne<{ id: string }>(deleteQuery, [itemId]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '보안그룹 항목을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('보안그룹 항목 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '보안그룹 항목 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


