// ============================================
// 회사 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Company, ApiResponse, PaginationInfo } from '@/types';

// GET - 회사 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyCode = searchParams.get('company_code') || '';
    const companyName = searchParams.get('company_name') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (companyCode) {
      conditions.push(`company_code ILIKE $${paramIndex}`);
      params.push(`%${companyCode}%`);
      paramIndex++;
    }

    if (companyName) {
      conditions.push(`company_name ILIKE $${paramIndex}`);
      params.push(`%${companyName}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.companies 
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        id, company_code, company_name, note, is_active,
        created_by, created_at, updated_by, updated_at
      FROM public.companies
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<Company>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<Company[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('회사 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '회사 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 회사 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_code, company_name, note, is_active } = body;

    if (!company_code || !company_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '회사코드와 회사명은 필수입니다.' },
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO public.companies 
        (company_code, company_name, note, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await queryOne<Company>(insertQuery, [
      company_code,
      company_name,
      note || null,
      is_active ?? true,
      'admin',
    ]);

    return NextResponse.json<ApiResponse<Company>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('회사 추가 에러:', error);
    
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'DUPLICATE_KEY', message: '이미 존재하는 회사코드입니다.' },
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '회사 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

