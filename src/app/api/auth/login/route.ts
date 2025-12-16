// ============================================
// 로그인 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createToken, verifyPassword } from '@/lib/auth';

interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  status: number;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 입력값 검증
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '이메일과 비밀번호를 입력해주세요.' } },
        { status: 400 }
      );
    }

    // 어드민 사용자 조회
    const user = await queryOne<AdminUser>(
      `SELECT id, email, password_hash, name, role, status 
       FROM admin_users 
       WHERE email = $1`,
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증에 실패했습니다.' } },
        { status: 401 }
      );
    }

    // 계정 상태 확인
    if (user.status !== 1) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '비활성화된 계정입니다.' } },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: '인증에 실패했습니다.' } },
        { status: 401 }
      );
    }

    // 마지막 로그인 시간 업데이트
    await query(
      `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    // 로그인 로그 기록
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    
    await query(
      `INSERT INTO admin_login_logs (admin_id, admin_email, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, user.email, ip, userAgent]
    );

    // JWT 토큰 생성
    const token = await createToken({
      sub: String(user.id),
      email: user.email,
      name: user.name || '관리자',
      role: user.role,
      organization: '현대그린푸드 본사',
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '관리자',
        role: user.role,
        organization: '현대그린푸드 본사',
      },
    });
  } catch (error) {
    // 개발 환경에서만 에러 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

