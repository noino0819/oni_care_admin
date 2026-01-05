// ============================================
// 회원별 포인트 내역 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 포인트 내역 조회
    const { data: history, error: historyError } = await supabase
      .from('point_history')
      .select(`
        id,
        user_id,
        transaction_type,
        source,
        source_detail,
        points,
        balance_after,
        is_revoked,
        created_at,
        users!inner(email)
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('포인트 내역 조회 오류:', historyError);
      return NextResponse.json(
        { success: false, error: { message: '포인트 내역 조회 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    const formattedData = history?.map(item => ({
      id: item.id,
      user_id: item.user_id,
      email: (item.users as { email: string })?.email || '',
      transaction_type: item.transaction_type,
      source: item.source,
      source_detail: item.source_detail,
      points: item.points,
      balance_after: item.balance_after,
      is_revoked: item.is_revoked || false,
      created_at: item.created_at,
    })) || [];

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

