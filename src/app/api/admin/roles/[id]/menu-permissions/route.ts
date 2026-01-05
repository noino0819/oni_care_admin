// ============================================
// 역할별 메뉴 권한 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { RoleMenuPermission, ApiResponse } from '@/types';

// GET - 역할별 메뉴 권한 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;

    // 역할 존재 확인
    const role = await queryOne<{ id: number }>(
      `SELECT id FROM public.roles WHERE id = $1`,
      [roleId]
    );

    if (!role) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '역할을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    // 모든 메뉴와 권한 정보 조회 (권한이 없는 메뉴도 포함)
    const dataQuery = `
      SELECT 
        COALESCE(rmp.id, 0) as id,
        $1::integer as role_id,
        am.id as menu_id,
        am.menu_name,
        am.menu_path,
        am.parent_id,
        am.depth,
        am.sort_order,
        COALESCE(rmp.can_read, false) as can_read,
        COALESCE(rmp.can_write, false) as can_write,
        COALESCE(rmp.can_update, false) as can_update,
        COALESCE(rmp.can_delete, false) as can_delete,
        COALESCE(rmp.can_export, false) as can_export,
        COALESCE(rmp.is_active, true) as is_active
      FROM public.admin_menus am
      LEFT JOIN public.role_menu_permissions rmp 
        ON am.id = rmp.menu_id AND rmp.role_id = $1
      WHERE am.is_active = true
      ORDER BY am.depth, am.sort_order, am.id
    `;

    const data = await query<RoleMenuPermission>(dataQuery, [roleId]);

    return NextResponse.json<ApiResponse<RoleMenuPermission[]>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('메뉴 권한 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '메뉴 권한 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 역할별 메뉴 권한 저장 (UPSERT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const body = await request.json();
    const { permissions } = body as { permissions: RoleMenuPermission[] };

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '권한 데이터가 필요합니다.' },
      }, { status: 400 });
    }

    // 트랜잭션으로 처리 (각 권한을 UPSERT)
    for (const perm of permissions) {
      const upsertQuery = `
        INSERT INTO public.role_menu_permissions 
          (role_id, menu_id, can_read, can_write, can_update, can_delete, can_export, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (role_id, menu_id) 
        DO UPDATE SET 
          can_read = EXCLUDED.can_read,
          can_write = EXCLUDED.can_write,
          can_update = EXCLUDED.can_update,
          can_delete = EXCLUDED.can_delete,
          can_export = EXCLUDED.can_export,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;

      await query(upsertQuery, [
        roleId,
        perm.menu_id,
        perm.can_read ?? false,
        perm.can_write ?? false,
        perm.can_update ?? false,
        perm.can_delete ?? false,
        perm.can_export ?? false,
        perm.is_active ?? true,
      ]);
    }

    return NextResponse.json<ApiResponse<{ saved: number }>>({
      success: true,
      data: { saved: permissions.length },
    });
  } catch (error) {
    console.error('메뉴 권한 저장 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'SAVE_ERROR', message: '메뉴 권한 저장 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





