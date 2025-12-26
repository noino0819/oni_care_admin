// ============================================
// 공지사항 상세/수정/삭제 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 공지사항 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const notice = await appQuery<{
      id: string;
      title: string;
      content: string;
      image_url: string | null;
      visibility_scope: string[];
      company_codes: string[];
      store_visible: boolean;
      start_date: string | null;
      end_date: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, content, image_url, visibility_scope, company_codes,
              store_visible, start_date, end_date, created_at, updated_at
       FROM notices
       WHERE id = $1`,
      [id]
    );

    if (notice.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '공지사항을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notice[0],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// PUT: 공지사항 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const body = await request.json();
    const {
      title,
      content,
      image_url,
      visibility_scope,
      company_codes,
      store_visible,
      start_date,
      end_date,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '제목과 내용을 입력해주세요.' } },
        { status: 400 }
      );
    }

    await appQuery(
      `UPDATE notices SET
        title = $1, content = $2, image_url = $3, visibility_scope = $4, company_codes = $5,
        store_visible = $6, start_date = $7, end_date = $8, updated_by = $9, updated_at = NOW()
       WHERE id = $10`,
      [
        title.trim(),
        content.trim(),
        image_url || null,
        visibility_scope || ['all'],
        company_codes || [],
        store_visible || false,
        start_date || null,
        end_date || null,
        payload.name || payload.email || 'admin',
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// DELETE: 공지사항 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    await appQuery(`DELETE FROM notices WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

