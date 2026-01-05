// ============================================
// 개인정보 접근로그 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { PersonalInfoAccessLog, ApiResponse, PaginationInfo } from '@/types';

// GET - 개인정보 접근로그 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || '';
    const userName = searchParams.get('user_name') || '';
    const deviceType = searchParams.get('device_type') || '';
    const businessCode = searchParams.get('business_code') || '';
    const surveyId = searchParams.get('survey_id') || '';
    const loginFrom = searchParams.get('login_from') || '';
    const loginTo = searchParams.get('login_to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`user_id ILIKE $${paramIndex}`);
      params.push(`%${userId}%`);
      paramIndex++;
    }

    if (userName) {
      conditions.push(`user_name ILIKE $${paramIndex}`);
      params.push(`%${userName}%`);
      paramIndex++;
    }

    if (deviceType) {
      conditions.push(`device_type ILIKE $${paramIndex}`);
      params.push(`%${deviceType}%`);
      paramIndex++;
    }

    if (businessCode) {
      conditions.push(`business_code ILIKE $${paramIndex}`);
      params.push(`%${businessCode}%`);
      paramIndex++;
    }

    if (surveyId) {
      conditions.push(`survey_id ILIKE $${paramIndex}`);
      params.push(`%${surveyId}%`);
      paramIndex++;
    }

    if (loginFrom) {
      conditions.push(`login_at >= $${paramIndex}::timestamp`);
      params.push(loginFrom);
      paramIndex++;
    }

    if (loginTo) {
      conditions.push(`login_at <= $${paramIndex}::timestamp + interval '1 day'`);
      params.push(loginTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.personal_info_access_logs 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, user_id, user_name, business_code, survey_id,
        device_type, os, browser, ip_address, login_at, logout_at, created_at
      FROM public.personal_info_access_logs
      ${whereClause}
      ORDER BY login_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<PersonalInfoAccessLog>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<PersonalInfoAccessLog[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('개인정보 접근로그 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '개인정보 접근로그 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





