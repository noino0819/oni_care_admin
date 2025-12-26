// ============================================
// 공지사항 목록 조회/등록 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 공지사항 목록 조회
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
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const offset = (page - 1) * pageSize;

    const title = searchParams.get('title');
    const status = searchParams.get('status')?.split(',').filter(Boolean);
    const visibilityScope = searchParams.get('visibility_scope')?.split(',').filter(Boolean);
    const companyCode = searchParams.get('company_code');
    const createdFrom = searchParams.get('created_from');
    const createdTo = searchParams.get('created_to');
    const sortField = searchParams.get('sort_field') || 'created_at';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    // 동적 쿼리 빌드
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (title) {
      conditions.push(`title ILIKE $${paramIndex}`);
      params.push(`%${title}%`);
      paramIndex++;
    }

    if (visibilityScope && visibilityScope.length > 0) {
      conditions.push(`visibility_scope && $${paramIndex}::text[]`);
      params.push(`{${visibilityScope.join(',')}}`);
      paramIndex++;
    }

    if (companyCode) {
      conditions.push(`$${paramIndex} = ANY(company_codes)`);
      params.push(companyCode);
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

    // 상태 필터는 SQL에서 CASE 문으로 처리
    let statusFilter = '';
    if (status && status.length > 0 && status.length < 3) {
      const statusConditions: string[] = [];
      if (status.includes('before')) {
        statusConditions.push(`(start_date IS NULL OR start_date > CURRENT_DATE)`);
      }
      if (status.includes('active')) {
        statusConditions.push(`(start_date IS NOT NULL AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE))`);
      }
      if (status.includes('ended')) {
        statusConditions.push(`(end_date IS NOT NULL AND end_date < CURRENT_DATE)`);
      }
      if (statusConditions.length > 0) {
        statusFilter = `AND (${statusConditions.join(' OR ')})`;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')} ${statusFilter}` : (statusFilter ? `WHERE 1=1 ${statusFilter}` : '');
    
    // 정렬 필드 검증
    const allowedSortFields = ['title', 'created_at', 'start_date', 'end_date'];
    const safeField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const safeDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // 전체 개수 조회
    const countResult = await appQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM notices ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 공지사항 목록 조회
    const notices = await appQuery<{
      id: string;
      title: string;
      visibility_scope: string[];
      company_codes: string[];
      start_date: string | null;
      end_date: string | null;
      created_at: string;
    }>(
      `SELECT id, title, visibility_scope, company_codes, start_date, end_date, created_at
       FROM notices
       ${whereClause}
       ORDER BY ${safeField} ${safeDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    // 상태 라벨 추가
    const formattedNotices = notices.map(notice => {
      let status = 'before';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startDate = notice.start_date ? new Date(notice.start_date) : null;
      const endDate = notice.end_date ? new Date(notice.end_date) : null;
      
      if (startDate && startDate <= today) {
        if (!endDate || endDate >= today) {
          status = 'active';
        } else {
          status = 'ended';
        }
      }
      
      return { ...notice, status };
    });

    return NextResponse.json({
      success: true,
      data: formattedNotices,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

// POST: 공지사항 등록
export async function POST(request: NextRequest) {
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

    const result = await appQuery<{ id: string }>(
      `INSERT INTO notices (
        title, content, image_url, visibility_scope, company_codes,
        store_visible, start_date, end_date, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING id`,
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
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result[0]?.id },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

