// ============================================
// 중분류 카테고리 상세/수정/삭제 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 중분류 카테고리 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const subcategory = await appQuery<{
      id: number;
      category_id: number;
      subcategory_name: string;
      display_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      category_name?: string;
    }>(
      `SELECT s.id, s.category_id, s.subcategory_name, s.display_order, 
              s.is_active, s.created_at, s.updated_at, c.category_name
       FROM content_subcategories s
       JOIN content_categories c ON s.category_id = c.id
       WHERE s.id = $1`,
      [parseInt(id)]
    );

    if (subcategory.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '중분류를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subcategory[0],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT: 중분류 카테고리 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category_id, subcategory_name, display_order, is_active } = body;

    if (!subcategory_name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '중분류명을 입력해주세요.' } },
        { status: 400 }
      );
    }

    await appQuery(
      `UPDATE content_subcategories SET
        category_id = COALESCE($1, category_id), subcategory_name = $2, 
        display_order = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5`,
      [
        category_id || null,
        subcategory_name.trim(),
        display_order || 0,
        is_active !== false,
        parseInt(id),
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: parseInt(id) },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 중분류 카테고리 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    await appQuery(`DELETE FROM content_subcategories WHERE id = $1`, [parseInt(id)]);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

