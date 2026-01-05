// ============================================
// 회원별 포인트 내역 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

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

    // 포인트 내역 조회
    const history = await appQuery<{
      id: string;
      user_id: string;
      email: string;
      transaction_type: string;
      source: string;
      source_detail: string | null;
      points: number;
      balance_after: number;
      is_revoked: boolean;
      created_at: string;
    }>(
      `SELECT ph.id, ph.user_id, u.email, ph.transaction_type, ph.source, 
              ph.source_detail, ph.points, ph.balance_after, 
              COALESCE(ph.is_revoked, false) as is_revoked, ph.created_at
       FROM point_history ph
       JOIN users u ON u.id = ph.user_id
       WHERE ph.user_id = $1
       ORDER BY ph.created_at DESC`,
      [id]
    );

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
