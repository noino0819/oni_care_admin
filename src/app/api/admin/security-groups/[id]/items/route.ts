// ============================================
// 보안 그룹 항목 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { SecurityGroupItem, ApiResponse } from '@/types';

// GET - 보안그룹 항목 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const dataQuery = `
      SELECT 
        id, group_id, entry_path, company_code, company_name, is_active, created_at
      FROM public.security_group_items
      WHERE group_id = $1
      ORDER BY created_at ASC
    `;
    
    const data = await query<SecurityGroupItem>(dataQuery, [groupId]);

    return NextResponse.json<ApiResponse<SecurityGroupItem[]>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('보안그룹 항목 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '보안그룹 항목 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 보안그룹 항목 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const { entry_path, company_code, company_name, is_active } = body;

    const insertQuery = `
      INSERT INTO public.security_group_items 
        (group_id, entry_path, company_code, company_name, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await queryOne<SecurityGroupItem>(insertQuery, [
      groupId,
      entry_path || null,
      company_code || null,
      company_name || null,
      is_active ?? true,
    ]);

    return NextResponse.json<ApiResponse<SecurityGroupItem>>({
      success: true,
      data: result!,
    });
  } catch (error) {
    console.error('보안그룹 항목 추가 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '보안그룹 항목 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




