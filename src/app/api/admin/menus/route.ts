// ============================================
// 어드민 메뉴 관리 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { AdminMenu, ApiResponse } from '@/types';

// 메뉴를 트리 구조로 변환
function buildMenuTree(menus: AdminMenu[]): AdminMenu[] {
  const menuMap = new Map<number, AdminMenu>();
  const roots: AdminMenu[] = [];

  // 모든 메뉴를 맵에 저장
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // 트리 구조 생성
  menus.forEach(menu => {
    const menuNode = menuMap.get(menu.id)!;
    if (menu.parent_id === null) {
      roots.push(menuNode);
    } else {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(menuNode);
      }
    }
  });

  return roots;
}

// GET - 메뉴 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const depth = searchParams.get('depth');
    const flat = searchParams.get('flat') === 'true';
    const isActive = searchParams.get('is_active');

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (parentId !== null && parentId !== '') {
      if (parentId === 'null') {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push(`parent_id = $${paramIndex}`);
        params.push(parseInt(parentId));
        paramIndex++;
      }
    }

    if (depth !== null && depth !== '') {
      conditions.push(`depth = $${paramIndex}`);
      params.push(parseInt(depth));
      paramIndex++;
    }

    if (isActive !== null && isActive !== '') {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'Y' || isActive === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const dataQuery = `
      SELECT id, menu_name, menu_path, parent_id, depth, sort_order, icon, is_active, created_at, updated_at
      FROM public.admin_menus
      ${whereClause}
      ORDER BY depth, sort_order, id
    `;

    const data = await query<AdminMenu>(dataQuery, params);

    // flat 파라미터가 없으면 트리 구조로 반환
    const responseData = flat ? data : buildMenuTree(data);

    return NextResponse.json<ApiResponse<AdminMenu[]>>({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('메뉴 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '메뉴 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 메뉴 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menu_name, menu_path, parent_id, sort_order, icon, is_active } = body;

    if (!menu_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '메뉴명은 필수입니다.' },
      }, { status: 400 });
    }

    // depth 계산
    let depth = 1;
    if (parent_id) {
      const parent = await queryOne<{ depth: number }>(
        `SELECT depth FROM public.admin_menus WHERE id = $1`,
        [parent_id]
      );
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    // sort_order 자동 계산 (같은 depth, parent_id 중 최대값 + 1)
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrder = await queryOne<{ max_order: number | null }>(
        `SELECT MAX(sort_order) as max_order FROM public.admin_menus WHERE parent_id ${parent_id ? '= $1' : 'IS NULL'} AND depth = $${parent_id ? '2' : '1'}`,
        parent_id ? [parent_id, depth] : [depth]
      );
      finalSortOrder = (maxOrder?.max_order ?? 0) + 1;
    }

    const insertQuery = `
      INSERT INTO public.admin_menus (menu_name, menu_path, parent_id, depth, sort_order, icon, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await queryOne<AdminMenu>(insertQuery, [
      menu_name,
      menu_path || null,
      parent_id || null,
      depth,
      finalSortOrder,
      icon || null,
      is_active ?? true,
    ]);

    return NextResponse.json<ApiResponse<AdminMenu>>({
      success: true,
      data: result!,
    });
  } catch (error) {
    console.error('메뉴 추가 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '메뉴 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





