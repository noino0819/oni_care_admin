// ============================================
// 중분류 카테고리 개별 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// 중분류 상세 조회
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
      `SELECT * FROM content_subcategories WHERE id = $1`,
      [id]
    );

    if (!data) {
      return NextResponse.json(
        { success: false, error: { message: '중분류를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('중분류 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 중분류 수정
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
    const { category_id, subcategory_name, display_order, is_active } = body;

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: { message: '대분류를 선택해주세요.' } },
        { status: 400 }
      );
    }

    if (!subcategory_name) {
      return NextResponse.json(
        { success: false, error: { message: '중분류명은 필수입니다.' } },
        { status: 400 }
      );
    }

    const result = await appQueryOne(
      `UPDATE content_subcategories 
       SET category_id = $1, subcategory_name = $2, display_order = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [category_id, subcategory_name, display_order || 1, is_active ?? true, id]
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { message: '중분류를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('중분류 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 중분류 삭제
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

    await appQuery(
      `DELETE FROM content_subcategories WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true, message: '중분류가 삭제되었습니다.' });
  } catch (error) {
    console.error('중분류 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
