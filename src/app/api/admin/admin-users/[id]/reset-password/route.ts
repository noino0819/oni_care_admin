// ============================================
// 관리자 비밀번호 초기화 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { ApiResponse } from '@/types';
import crypto from 'crypto';

// 비밀번호 해시 함수
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST - 비밀번호 초기화
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 먼저 해당 관리자 조회
    const userQuery = `
      SELECT login_id FROM public.admin_users WHERE id = $1
    `;
    const user = await queryOne<{ login_id: string }>(userQuery, [id]);

    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: { code: 'NOT_FOUND', message: '관리자를 찾을 수 없습니다.' },
      }, { status: 404 });
    }

    // 비밀번호 초기화 (login_id + "1234")
    const newPassword = `${user.login_id}1234`;
    const passwordHash = hashPassword(newPassword);

    const updateQuery = `
      UPDATE public.admin_users
      SET 
        password_hash = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, login_id
    `;

    const result = await queryOne<{ id: string; login_id: string }>(updateQuery, [
      passwordHash,
      'admin',
      id,
    ]);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: '비밀번호가 초기화되었습니다.' },
    });
  } catch (error) {
    console.error('비밀번호 초기화 에러:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: { code: 'UPDATE_ERROR', message: '비밀번호 초기화 중 오류가 발생했습니다.' },
    }, { status: 500 });
  }
}





