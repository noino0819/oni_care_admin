// ============================================
// 시스템 환경설정 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction } from '@/lib/db';
import type { SystemSetting, ApiResponse, PaginationInfo } from '@/types';

// GET - 환경설정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settingKey = searchParams.get('setting_key') || '';
    const settingName = searchParams.get('setting_name') || '';
    const isActive = searchParams.get('is_active') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (settingKey) {
      conditions.push(`setting_key ILIKE $${paramIndex}`);
      params.push(`%${settingKey}%`);
      paramIndex++;
    }

    if (settingName) {
      conditions.push(`setting_name ILIKE $${paramIndex}`);
      params.push(`%${settingName}%`);
      paramIndex++;
    }

    if (isActive === 'Y') {
      conditions.push(`is_active = true`);
    } else if (isActive === 'N') {
      conditions.push(`is_active = false`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.system_settings 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, setting_key, setting_name, setting_value, description, 
        is_active, created_by, created_at, updated_by, updated_at
      FROM public.system_settings
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<SystemSetting>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<SystemSetting[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('시스템 환경설정 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '환경설정 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 환경설정 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setting_key, setting_name, setting_value, description, is_active } = body;

    if (!setting_key || !setting_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '환경변수키와 환경변수명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.system_settings 
        (setting_key, setting_name, setting_value, description, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await queryOne<SystemSetting>(insertQuery, [
      setting_key,
      setting_name,
      setting_value || null,
      description || null,
      is_active ?? true,
      'admin', // TODO: 실제 로그인한 사용자 ID로 변경
    ]);

    return NextResponse.json<ApiResponse<SystemSetting>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('시스템 환경설정 추가 에러:', error);
    
    // 중복 키 에러 처리
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 환경변수키입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '환경설정 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





