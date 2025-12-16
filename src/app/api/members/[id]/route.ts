// ============================================
// 회원 상세 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;

    // 회원 상세 정보 조회
    const member = await queryOne<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      gender: string | null;
      birth_date: string | null;
      height: number | null;
      weight: number | null;
      diseases: string[];
      interests: string[];
      business_code: string | null;
      is_fs_member: boolean;
      is_active: boolean;
      marketing_push_agreed: boolean;
      marketing_sms_agreed: boolean;
      last_login: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
        id, email, name, phone, gender, birth_date,
        height, weight, diseases, interests, business_code,
        is_fs_member, is_active, marketing_push_agreed, marketing_sms_agreed,
        last_login, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '회원을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 포인트 정보 조회
    const points = await queryOne<{ total_points: number }>(
      `SELECT total_points FROM user_points WHERE user_id = $1`,
      [id]
    );

    // 개인정보 접속 기록
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    await query(
      `INSERT INTO personal_access_logs (user_id, access_type, accessed_data, ip_address)
       VALUES ($1, 'view', 'member_detail', $2)`,
      [id, ip]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        member_type: member.is_fs_member ? 'FS' : member.business_code ? '제휴사' : '일반',
        total_points: points?.total_points || 0,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

