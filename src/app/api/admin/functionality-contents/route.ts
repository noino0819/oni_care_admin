// ============================================
// 기능성 내용 마스터 API (목록 조회/등록)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, appQueryOne } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 기능성 내용 목록 조회
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
        const pageSize = parseInt(searchParams.get('page_size') || '50');
        const offset = (page - 1) * pageSize;

        // 필터 조건
        const searchTerm = searchParams.get('search');
        const functionalityCode = searchParams.get('functionality_code');

        // 동적 쿼리 빌드
        const conditions: string[] = ['is_active = true'];
        const params: string[] = [];
        let paramIndex = 1;

        if (searchTerm) {
            conditions.push(`content ILIKE $${paramIndex}`);
            params.push(`%${searchTerm}%`);
            paramIndex++;
        }

        if (functionalityCode) {
            conditions.push(`functionality_code = $${paramIndex}`);
            params.push(functionalityCode);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 전체 개수 조회
        const countResult = await appQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM public.functionality_contents ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0]?.count || '0');

        // 기능성 내용 목록 조회
        const contents = await appQuery<{
            id: number;
            functionality_code: string;
            content: string;
            description: string | null;
            is_active: boolean;
            created_at: string;
            updated_at: string;
        }>(
            `SELECT 
        id, functionality_code, content, description, is_active,
        created_at, updated_at
       FROM public.functionality_contents
       ${whereClause}
       ORDER BY functionality_code ASC, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, pageSize.toString(), offset.toString()]
        );

        return NextResponse.json({
            success: true,
            data: contents,
            pagination: {
                page,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Functionality Contents GET Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

// POST: 기능성 내용 등록
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
        const { content, description, is_active = true } = body;

        if (!content?.trim()) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: '기능성 내용을 입력해주세요.' } },
                { status: 400 }
            );
        }

        // 기능성 내용 등록 (코드는 시퀀스로 자동 생성)
        const result = await appQueryOne<{ id: number; functionality_code: string }>(
            `INSERT INTO public.functionality_contents (
        functionality_code, content, description, is_active
      ) VALUES (
        'FC' || LPAD(nextval('functionality_content_code_seq')::text, 5, '0'),
        $1, $2, $3
      )
      RETURNING id, functionality_code`,
            [content.trim(), description || null, is_active]
        );

        return NextResponse.json({
            success: true,
            data: result,
        }, { status: 201 });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Functionality Contents POST Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

