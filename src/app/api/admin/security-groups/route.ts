// ============================================
// 보안 그룹 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { SecurityGroup, ApiResponse, PaginationInfo } from '@/types';

// GET - 보안그룹 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupName = searchParams.get('group_name') || '';
    const groupId = searchParams.get('group_id') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (groupName) {
      conditions.push(`group_name ILIKE $${paramIndex}`);
      params.push(`%${groupName}%`);
      paramIndex++;
    }

    if (groupId) {
      conditions.push(`id::text ILIKE $${paramIndex}`);
      params.push(`%${groupId}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.security_groups 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, group_name, description, is_active,
        created_by, created_at, updated_by, updated_at
      FROM public.security_groups
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<SecurityGroup>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<SecurityGroup[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('보안그룹 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '보안그룹 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 보안그룹 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { group_name, description, is_active } = body;

    if (!group_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '보안그룹명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.security_groups 
        (group_name, description, is_active, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await queryOne<SecurityGroup>(insertQuery, [
      group_name,
      description || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<SecurityGroup>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('보안그룹 추가 에러:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '보안그룹 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}






