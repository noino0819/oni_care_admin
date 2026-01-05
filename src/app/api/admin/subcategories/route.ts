// ============================================
// 중분류 카테고리 API
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

// 중분류 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subcategoryName = searchParams.get('subcategory_name');
    const isActive = searchParams.get('is_active');
    const categoryId = searchParams.get('category_id');

    let query = supabase
      .from('content_subcategories')
      .select(`
        *,
        content_categories!inner(category_name, category_type)
      `)
      .order('display_order', { ascending: true });

    if (subcategoryName) {
      query = query.ilike('subcategory_name', `%${subcategoryName}%`);
    }
    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('중분류 조회 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '중분류 조회 중 오류가 발생했습니다.' } },
        { status: 500 }
      );
    }

    const formattedData = data?.map(item => ({
      ...item,
      category_name: (item.content_categories as { category_name: string })?.category_name,
      category_type: (item.content_categories as { category_type: string })?.category_type,
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

// 중분류 등록
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
    const { category_id, subcategory_name, display_order, is_active } = body;

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: { message: '대분류를 선택해주세요.' } },
        { status: 400 }
      );
    }

    if (!subcategory_name) {
      return NextResponse.json(
        { success: false, error: { message: '중분류명은 필수입니다.' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('content_subcategories')
      .insert({
        category_id,
        subcategory_name,
        display_order: display_order || 1,
        is_active: is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('중분류 등록 오류:', error);
      return NextResponse.json(
        { success: false, error: { message: '중분류 등록 중 오류가 발생했습니다.' } },
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

