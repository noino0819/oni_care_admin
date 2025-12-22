// ============================================
// 지점별 고객 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { StoreCustomer, ApiResponse, PaginationInfo } from '@/types';

// 회원코드 생성 함수
function generateMemberCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let code = 'PQ';
  for (let i = 0; i < 4; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  code += letters.charAt(Math.floor(Math.random() * letters.length));
  code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
}

// GET - 고객 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id') || '';
    const customerName = searchParams.get('customer_name') || '';
    const memberCode = searchParams.get('member_code') || '';
    const receiveAgreed = searchParams.get('receive_agreed') || '';
    const lastVisitFrom = searchParams.get('last_visit_from') || '';
    const lastVisitTo = searchParams.get('last_visit_to') || '';
    const registeredFrom = searchParams.get('registered_from') || '';
    const registeredTo = searchParams.get('registered_to') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // 조건절 생성
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (storeId) {
      conditions.push(`(first_store_id = $${paramIndex} OR $${paramIndex} = ANY(authorized_stores))`);
      params.push(storeId);
      paramIndex++;
    }

    if (customerName) {
      conditions.push(`customer_name ILIKE $${paramIndex}`);
      params.push(`%${customerName}%`);
      paramIndex++;
    }

    if (memberCode) {
      conditions.push(`member_code ILIKE $${paramIndex}`);
      params.push(`%${memberCode}%`);
      paramIndex++;
    }

    if (receiveAgreed === 'Y') {
      conditions.push(`(push_agreed = true OR sms_agreed = true)`);
    } else if (receiveAgreed === 'N') {
      conditions.push(`(push_agreed = false AND sms_agreed = false)`);
    }

    if (lastVisitFrom) {
      conditions.push(`last_visit_at >= $${paramIndex}`);
      params.push(lastVisitFrom);
      paramIndex++;
    }

    if (lastVisitTo) {
      conditions.push(`last_visit_at <= $${paramIndex}`);
      params.push(lastVisitTo);
      paramIndex++;
    }

    if (registeredFrom) {
      conditions.push(`registered_at >= $${paramIndex}`);
      params.push(registeredFrom);
      paramIndex++;
    }

    if (registeredTo) {
      conditions.push(`registered_at <= $${paramIndex}`);
      params.push(registeredTo);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM public.store_customers
      ${whereClause}
    `;
    const countResult = await queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // 데이터 조회
    const dataQuery = `
      SELECT 
        sc.id, sc.member_code, sc.customer_name, sc.phone,
        sc.first_store_id,
        sg.group_name as first_store_name,
        sc.authorized_stores,
        sc.push_agreed, sc.sms_agreed,
        sc.registered_at, sc.joined_at, sc.last_visit_at,
        sc.created_at, sc.updated_at
      FROM public.store_customers sc
      LEFT JOIN public.security_groups sg ON sc.first_store_id = sg.id
      ${whereClause}
      ORDER BY sc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const data = await query<StoreCustomer>(dataQuery, [...params, limit, offset]);

    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json<ApiResponse<StoreCustomer[]>>({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    console.error('고객 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '고객 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// POST - 고객 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      customer_name, phone, first_store_id, authorized_stores, 
      push_agreed, sms_agreed, registered_at, joined_at 
    } = body;

    if (!customer_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '고객명은 필수입니다.' },
      }, { status: 400 });
    }

    // 회원코드 자동 생성
    const memberCode = generateMemberCode();

    const insertQuery = `
      INSERT INTO public.store_customers 
        (member_code, customer_name, phone, first_store_id, authorized_stores, 
         push_agreed, sms_agreed, registered_at, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await queryOne<StoreCustomer>(insertQuery, [
      memberCode,
      customer_name,
      phone || null,
      first_store_id || null,
      authorized_stores || [],
      push_agreed ?? false,
      sms_agreed ?? false,
      registered_at || null,
      joined_at || null,
    ]);

    return NextResponse.json<ApiResponse<StoreCustomer>>({
      success: true,
      data: result!,
    });
  } catch (error: unknown) {
    console.error('고객 추가 에러:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'CREATE_ERROR', message: '고객 추가 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}


