// ============================================
// 대분류 카테고리 API
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

// 대분류 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get('category_name');
    const isActive = searchParams.get('is_active');

    let query = supabase
      .from('content_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (categoryName) {
      query = query.ilike('category_name', `%${categoryName}%`);
    }
    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('카테고리 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '카테고리 조회 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { success: false, error: { message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// 대분류 등록
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

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
      .insert({
        category_type: category_type || '',
        category_name,
        subcategory_types: subcategory_types || null,
        display_order: display_order || 1,
        is_active: is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('카테고리 등록 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '카테고리 등록 중 오류가 발생했습니다.' } },
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

