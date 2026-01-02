// ============================================
// 지점별 고객 상세 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { StoreCustomer, ApiResponse } from '@/types';

// GET - 고객 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      WHERE sc.id = $1
    `;
    
    const data = await queryOne<StoreCustomer>(dataQuery, [id]);

    if (!data) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '고객을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<StoreCustomer>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error('고객 조회 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'FETCH_ERROR', message: '고객 조회 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// PUT - 고객 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      customer_name, phone, first_store_id, authorized_stores, 
      push_agreed, sms_agreed, registered_at, joined_at, last_visit_at 
    } = body;

    if (!customer_name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '고객명은 필수입니다.' },
      }, { status: 400 });
    }

    const updateQuery = `
      UPDATE public.store_customers
      SET 
        customer_name = $1,
        phone = $2,
        first_store_id = $3,
        authorized_stores = $4,
        push_agreed = $5,
        sms_agreed = $6,
        registered_at = $7,
        joined_at = $8,
        last_visit_at = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;

    const result = await queryOne<StoreCustomer>(updateQuery, [
      customer_name,
      phone || null,
      first_store_id || null,
      authorized_stores || [],
      push_agreed ?? false,
      sms_agreed ?? false,
      registered_at || null,
      joined_at || null,
      last_visit_at || null,
      id,
    ]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '고객을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<StoreCustomer>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('고객 수정 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '고객 수정 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}

// DELETE - 고객 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleteQuery = `
      DELETE FROM public.store_customers
      WHERE id = $1
      RETURNING id
    `;

    const result = await queryOne<{ id: string }>(deleteQuery, [id]);

    if (!result) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '고객을 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('고객 삭제 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'DELETE_ERROR', message: '고객 삭제 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}




