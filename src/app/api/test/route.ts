// DB 연결 테스트 API
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // DB 연결 테스트
    const result = await query('SELECT NOW() as time, current_database() as db');
    
    // admin_users 테이블 확인
    const users = await query('SELECT id, email, name, role, status FROM admin_users LIMIT 5');
    
    return NextResponse.json({
      success: true,
      db_time: result,
      admin_users: users,
    });
  } catch (error) {
    console.error('DB Test Error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

