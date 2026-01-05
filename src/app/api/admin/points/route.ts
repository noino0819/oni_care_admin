// ============================================
// 포인트 현황 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const memberTypes = searchParams.get('member_types');
    const businessCode = searchParams.get('business_code');
    const minPoints = searchParams.get('min_points');
    const maxPoints = searchParams.get('max_points');

    // 동적 쿼리 빌드
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${name}%`);
      paramIndex++;
    }
    if (id) {
      conditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${id}%`);
      paramIndex++;
    }
    if (memberTypes) {
      const types = memberTypes.split(',');
      conditions.push(`member_type = ANY($${paramIndex}::text[])`);
      params.push(`{${types.join(',')}}`);
      paramIndex++;
    }
    if (businessCode) {
      conditions.push(`business_code = $${paramIndex}`);
      params.push(businessCode);
      paramIndex++;
    }
    if (minPoints) {
      conditions.push(`COALESCE(total_points, 0) >= $${paramIndex}`);
      params.push(parseInt(minPoints));
      paramIndex++;
    }
    if (maxPoints) {
      conditions.push(`COALESCE(total_points, 0) <= $${paramIndex}`);
      params.push(parseInt(maxPoints));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const data = await appQuery<{
      id: string;
      email: string;
      name: string;
      member_type: string;
      business_code: string | null;
      total_points: number;
    }>(
      `SELECT id, email, name, COALESCE(member_type, 'normal') as member_type, 
              business_code, COALESCE(total_points, 0) as total_points
       FROM users
       ${whereClause}
       ORDER BY total_points DESC
       LIMIT 100`,
      params
    );

    const formattedData = data.map(user => ({
      user_id: user.id,
      email: user.email,
      name: user.name,
      member_type: user.member_type,
      business_code: user.business_code,
      total_points: user.total_points,
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('포인트 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
