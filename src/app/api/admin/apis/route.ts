// ============================================
// API 마스터 관리 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { AdminApi, ApiResponse, PaginationInfo } from '@/types';

// GET - API 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiName = searchParams.get('api_name') || '';
    const apiPath = searchParams.get('api_path') || '';
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (apiName) {
      conditions.push(`api_name ILIKE $${paramIndex}`);
      params.push(`%${apiName}%`);
      paramIndex++;
    }

    if (apiPath) {
      conditions.push(`api_path ILIKE $${paramIndex}`);
      params.push(`%${apiPath}%`);
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

    // 전체 개수 조회
    const countQuery = `SELECT COUNT(*) as count FROM public.admin_apis ${whereClause}`;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT id, api_name, api_path, description, is_active, created_at, updated_at
      FROM public.admin_apis
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<AdminApi>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<AdminApi[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('API 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'API 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - API 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_name, api_path, description, is_active } = body;

    if (!api_name || !api_path) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'API명과 API 경로는 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.admin_apis (api_name, api_path, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await queryOne<AdminApi>(insertQuery, [
      api_name,
      api_path,
      description || null,
      is_active ?? true,
    ]);

    return NextResponse.json<ApiResponse<AdminApi>>({
      success: true,
      data: result!,
    });
  } catch (error) {
    console.error('API 추가 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'API 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}



