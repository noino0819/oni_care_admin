// ============================================
// 역할별 API 권한 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { RoleApiPermission, ApiResponse } from '@/types';

// GET - 역할별 API 권한 조회
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

    // 모든 API와 권한 정보 조회
    const dataQuery = `
      SELECT 
        COALESCE(rap.id, 0) as id,
        $1::integer as role_id,
        aa.id as api_id,
        aa.api_name,
        aa.api_path,
        aa.description,
        COALESCE(rap.is_permitted, false) as is_permitted,
        COALESCE(rap.is_active, true) as is_active
      FROM public.admin_apis aa
      LEFT JOIN public.role_api_permissions rap 
        ON aa.id = rap.api_id AND rap.role_id = $1
      WHERE aa.is_active = true
      ORDER BY aa.id
    `;

    const data = await query<RoleApiPermission>(dataQuery, [roleId]);

    return NextResponse.json<ApiResponse<RoleApiPermission[]>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('API 권한 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'API 권한 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 역할별 API 권한 저장 (UPSERT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const body = await request.json();
    const { permissions } = body as { permissions: RoleApiPermission[] };

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '권한 데이터가 필요합니다.' },
      }, { status: 400 });
    }

    // 각 권한을 UPSERT
    for (const perm of permissions) {
      const upsertQuery = `
        INSERT INTO public.role_api_permissions 
          (role_id, api_id, is_permitted, is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (role_id, api_id) 
        DO UPDATE SET 
          is_permitted = EXCLUDED.is_permitted,
          is_active = EXCLUDED.is_active
      `;

      await query(upsertQuery, [
        roleId,
        perm.api_id,
        perm.is_permitted ?? false,
        perm.is_active ?? true,
      ]);
    }

    return NextResponse.json<ApiResponse<{ saved: number }>>({
      success: true,
      data: { saved: permissions.length },
    });
  } catch (error) {
    console.error('API 권한 저장 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'SAVE_ERROR', message: 'API 권한 저장 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


