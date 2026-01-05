// ============================================
// 포인트 회수 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne, withAppTransaction } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

export async function POST(
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

    const { id: historyId } = await params;

    // 포인트 내역 조회
    const history = await appQueryOne<{
      id: string;
      user_id: string;
      transaction_type: string;
      points: number;
      is_revoked: boolean;
    }>(
      `SELECT id, user_id, transaction_type, points, COALESCE(is_revoked, false) as is_revoked 
       FROM point_history WHERE id = $1`,
      [historyId]
    );

    if (!history) {
      return NextResponse.json(
        { success: false, error: { message: '포인트 내역을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    if (history.is_revoked) {
      return NextResponse.json(
        { success: false, error: { message: '이미 회수된 포인트입니다.' } },
        { status: 400 }
      );
    }

    if (history.transaction_type !== 'earn') {
      return NextResponse.json(
        { success: false, error: { message: '적립된 포인트만 회수할 수 있습니다.' } },
        { status: 400 }
      );
    }

    // 사용자 현재 포인트 조회
    const user = await appQueryOne<{ total_points: number }>(
      `SELECT COALESCE(total_points, 0) as total_points FROM users WHERE id = $1`,
      [history.user_id]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: '사용자를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 회수할 포인트보다 현재 보유 포인트가 적으면 오류
    if (user.total_points < history.points) {
      return NextResponse.json(
        { success: false, error: { message: '보유 포인트가 회수할 포인트보다 적습니다.' } },
        { status: 400 }
      );
    }

    // 트랜잭션으로 포인트 회수 처리
    await withAppTransaction(async (client) => {
      const newBalance = user.total_points - history.points;

      // 사용자 포인트 차감
      await client.query(
        `UPDATE users SET total_points = $1 WHERE id = $2`,
        [newBalance, history.user_id]
      );

      // 포인트 내역 회수 표시
      await client.query(
        `UPDATE point_history 
         SET is_revoked = true, revoked_at = NOW(), revoked_by = $1 
         WHERE id = $2`,
        [payload.name || payload.email || 'admin', historyId]
      );

      // 회수 내역 추가
      await client.query(
        `INSERT INTO point_history (user_id, transaction_type, source, source_detail, points, balance_after)
         VALUES ($1, 'use', 'admin_revoke', $2, $3, $4)`,
        [history.user_id, `관리자 회수 (원본 ID: ${historyId})`, -history.points, newBalance]
      );
    });

    return NextResponse.json({ success: true, message: '포인트가 회수되었습니다.' });
  } catch (error) {
    console.error('포인트 회수 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
