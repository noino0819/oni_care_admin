// ============================================
// 포인트 현황 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const memberTypes = searchParams.get('member_types');
    const businessCode = searchParams.get('business_code');
    const minPoints = searchParams.get('min_points');
    const maxPoints = searchParams.get('max_points');

    // 포인트 보유 회원 조회
    let query = supabase
      .from('users')
      .select('id, email, name, member_type, business_code, total_points')
      .order('total_points', { ascending: false });

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (id) {
      query = query.ilike('email', `%${id}%`);
    }
    if (memberTypes) {
      const types = memberTypes.split(',');
      query = query.in('member_type', types);
    }
    if (businessCode) {
      query = query.eq('business_code', businessCode);
    }
    if (minPoints) {
      query = query.gte('total_points', parseInt(minPoints));
    }
    if (maxPoints) {
      query = query.lte('total_points', parseInt(maxPoints));
    }

    const { data, error } = await query;

    if (error) {
      console.error('포인트 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '포인트 조회 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    const formattedData = data?.map(user => ({
      user_id: user.id,
      email: user.email,
      name: user.name,
      member_type: user.member_type || 'normal',
      business_code: user.business_code,
      total_points: user.total_points || 0,
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

