// ============================================
// 회원 목록 조회 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 필터 조건
    const name = searchParams.get('name');
    const email = searchParams.get('id'); // ID는 email
    const birthYear = searchParams.get('birth_year');
    const birthMonth = searchParams.get('birth_month');
    const birthDay = searchParams.get('birth_day');
    const gender = searchParams.get('gender');
    const memberTypes = searchParams.get('member_types')?.split(',').filter(Boolean);
    const phone = searchParams.get('phone');
    const businessCode = searchParams.get('business_code');
    const createdFrom = searchParams.get('created_from');
    const createdTo = searchParams.get('created_to');
    const sortField = searchParams.get('sort_field') || 'created_at';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    // 동적 쿼리 빌드
    const conditions: string[] = ['status = \'active\''];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${name}%`);
      paramIndex++;
    }

    if (email) {
      conditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${email}%`);
      paramIndex++;
    }

    if (birthYear || birthMonth || birthDay) {
      let dateCondition = '';
      if (birthYear) {
        dateCondition = `EXTRACT(YEAR FROM birth_date) = $${paramIndex}`;
        params.push(parseInt(birthYear));
        paramIndex++;
      }
      if (birthMonth) {
        if (dateCondition) dateCondition += ' AND ';
        dateCondition += `EXTRACT(MONTH FROM birth_date) = $${paramIndex}`;
        params.push(parseInt(birthMonth));
        paramIndex++;
      }
      if (birthDay) {
        if (dateCondition) dateCondition += ' AND ';
        dateCondition += `EXTRACT(DAY FROM birth_date) = $${paramIndex}`;
        params.push(parseInt(birthDay));
        paramIndex++;
      }
      conditions.push(`(${dateCondition})`);
    }

    if (gender) {
      conditions.push(`gender = $${paramIndex}`);
      params.push(gender);
      paramIndex++;
    }

    if (memberTypes && memberTypes.length > 0) {
      const typeConditions: string[] = [];
      if (memberTypes.includes('normal')) {
        typeConditions.push('(is_fs_member = false AND business_code IS NULL)');
      }
      if (memberTypes.includes('affiliate')) {
        typeConditions.push('(is_fs_member = false AND business_code IS NOT NULL)');
      }
      if (memberTypes.includes('fs')) {
        typeConditions.push('is_fs_member = true');
      }
      if (typeConditions.length > 0) {
        conditions.push(`(${typeConditions.join(' OR ')})`);
      }
    }

    if (phone) {
      conditions.push(`phone ILIKE $${paramIndex}`);
      params.push(`%${phone.replace(/\D/g, '')}%`);
      paramIndex++;
    }

    if (businessCode) {
      conditions.push(`business_code ILIKE $${paramIndex}`);
      params.push(`%${businessCode}%`);
      paramIndex++;
    }

    if (createdFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(createdFrom);
      paramIndex++;
    }

    if (createdTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(createdTo + ' 23:59:59');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 정렬 필드 검증
    const allowedSortFields = ['email', 'name', 'birth_date', 'gender', 'business_code', 'phone', 'created_at'];
    const safeField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const safeDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // 전체 개수 조회
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 회원 목록 조회
    const members = await query<{
      id: string;
      email: string;
      name: string;
      birth_date: string | null;
      gender: string | null;
      is_fs_member: boolean;
      business_code: string | null;
      phone: string | null;
      created_at: string;
    }>(
      `SELECT 
        id, email, name, birth_date, gender, 
        is_fs_member, business_code, phone, created_at
       FROM users
       ${whereClause}
       ORDER BY ${safeField} ${safeDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // 회원 구분 라벨 추가
    const formattedMembers = members.map((m) => ({
      ...m,
      member_type: m.is_fs_member ? 'FS' : m.business_code ? '제휴사' : '일반',
    }));

    return NextResponse.json({
      success: true,
      data: formattedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

