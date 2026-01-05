// ============================================
// 대분류 카테고리 개별 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne, withAppTransaction } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// 대분류 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const data = await appQueryOne(
      `SELECT * FROM content_categories WHERE id = $1`,
      [id]
    );

    if (!data) {
      return NextResponse.json(
        { success: false, error: { message: '카테고리를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('카테고리 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 대분류 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { category_type, category_name, subcategory_types, display_order, is_active } = body;

    if (!category_name) {
      return NextResponse.json(
        { success: false, error: { message: '대분류명은 필수입니다.' } },
        { status: 400 }
      );
    }

    const result = await appQueryOne(
      `UPDATE content_categories 
       SET category_type = $1, category_name = $2, subcategory_types = $3, 
           display_order = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [category_type || '', category_name, subcategory_types || null, display_order || 1, is_active ?? true, id]
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { message: '카테고리를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('카테고리 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 대분류 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const authHeader = req.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 트랜잭션으로 연결된 중분류도 함께 삭제
    await withAppTransaction(async (client) => {
      // 연결된 중분류 삭제
      await client.query(
        `DELETE FROM content_subcategories WHERE category_id = $1`,
        [id]
      );
      // 대분류 삭제
      await client.query(
        `DELETE FROM content_categories WHERE id = $1`,
        [id]
      );
    });

    return NextResponse.json({ success: true, message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('카테고리 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
