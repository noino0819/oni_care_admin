// ============================================
// 대분류 카테고리 개별 API
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

// 대분류 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: '카테고리를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 대분류 수정
export async function PUT(
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

    const { id } = await params;
    const body = await req.json();
    const { category_type, category_name, subcategory_types, display_order, is_active } = body;

    if (!category_name) {
      return NextResponse.json(
        { success: false, error: { message: '대분류명은 필수입니다.' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('content_categories')
      .update({
        category_type: category_type || '',
        category_name,
        subcategory_types: subcategory_types || null,
        display_order: display_order || 1,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('카테고리 수정 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '카테고리 수정 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 대분류 삭제
export async function DELETE(
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

    const { id } = await params;

    // 연결된 중분류 삭제
    await supabase
      .from('content_subcategories')
      .delete()
      .eq('category_id', id);

    // 대분류 삭제
    const { error } = await supabase
      .from('content_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('카테고리 삭제 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '카테고리 삭제 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

