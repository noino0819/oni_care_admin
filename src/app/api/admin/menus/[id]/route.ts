// ============================================
// 어드민 메뉴 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { AdminMenu, ApiResponse } from '@/types';

// GET - 메뉴 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await queryOne<AdminMenu>(
      `SELECT * FROM public.admin_menus WHERE id = $1`,
      [id]
    );

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminMenu>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('메뉴 상세 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '메뉴 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 메뉴 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { menu_name, menu_path, sort_order, icon, is_active } = body;

    if (!menu_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '메뉴명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.admin_menus
      SET menu_name = $1, menu_path = $2, sort_order = $3, icon = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await queryOne<AdminMenu>(updateQuery, [
      menu_name,
      menu_path || null,
      sort_order ?? 0,
      icon || null,
      is_active ?? true,
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<AdminMenu>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('메뉴 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '메뉴 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 메뉴 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 하위 메뉴가 있는지 확인
    const childCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.admin_menus WHERE parent_id = $1`,
      [id]
    );

    if (parseInt(childCount?.count || '0') > 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'CONSTRAINT_ERROR', message: '하위 메뉴가 있어 삭제할 수 없습니다.' },
      }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM public.admin_menus WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('메뉴 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '메뉴 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




