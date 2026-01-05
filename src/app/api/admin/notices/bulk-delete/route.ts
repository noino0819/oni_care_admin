// ============================================
// 공지사항 일괄 삭제 API
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

export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: '삭제할 공지사항을 선택해주세요.' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('notices')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('공지사항 삭제 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '공지사항 삭제 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: `${ids.length}개의 공지사항이 삭제되었습니다.` });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

