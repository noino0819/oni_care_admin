// ============================================
// 포인트 회수 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; loginId: string };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { id: historyId } = await params;

    // 포인트 내역 조회
    const { data: history, error: historyError } = await supabase
      .from('point_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (historyError || !history) {
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', history.user_id)
      .single();

    if (userError || !user) {
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

    // 포인트 회수 처리
    const newBalance = user.total_points - history.points;

    // 사용자 포인트 차감
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ total_points: newBalance })
      .eq('id', history.user_id);

    if (updateUserError) {
      console.error('사용자 포인트 업데이트 오류:', updateUserError);
      return NextResponse.json(
        { success: false, error: { message: '포인트 회수 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    // 포인트 내역 회수 표시
    const { error: updateHistoryError } = await supabase
      .from('point_history')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: admin.loginId,
      })
      .eq('id', historyId);

    if (updateHistoryError) {
      console.error('포인트 내역 업데이트 오류:', updateHistoryError);
      // 롤백 처리
      await supabase
        .from('users')
        .update({ total_points: user.total_points })
        .eq('id', history.user_id);
      
      return NextResponse.json(
        { success: false, error: { message: '포인트 회수 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    // 회수 내역 추가
    await supabase
      .from('point_history')
      .insert({
        user_id: history.user_id,
        transaction_type: 'use',
        source: 'admin_revoke',
        source_detail: `관리자 회수 (원본 ID: ${historyId})`,
        points: -history.points,
        balance_after: newBalance,
      });

    return NextResponse.json({ success: true, message: '포인트가 회수되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

