// ============================================
// 중분류 카테고리 일괄 삭제 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
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

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: '삭제할 중분류를 선택해주세요.' } },
        { status: 400 }
      );
    }

    await appQuery(
      `DELETE FROM content_subcategories WHERE id = ANY($1::int[])`,
      [ids]
    );

    return NextResponse.json({ success: true, message: `${ids.length}개의 중분류가 삭제되었습니다.` });
  } catch (error) {
    console.error('중분류 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
