// ============================================
// 영양제 상세 조회/수정 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET: 영양제 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
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

        // 영양제 상세 조회
        const supplements = await appQuery<{
            id: string;
            product_report_number: string | null;
            product_name: string;
            product_form: string | null;
            dosage: number | null;
            dosage_unit: string | null;
            intake_method: string | null;
            default_intake_time: string | null;
            default_intake_amount: string | null;
            default_intake_unit: string | null;
            manufacturer: string | null;
            image_url: string | null;
            is_active: boolean;
            created_at: string;
            updated_at: string;
        }>(
            `SELECT 
                id, product_report_number, product_name,
                form_unit as product_form,
                single_dose as dosage, dosage_unit,
                intake_method, default_intake_time, default_intake_amount,
                default_intake_unit, manufacturer, image_url, is_active,
                created_at, updated_at
             FROM public.supplement_products_master WHERE id = $1`,
            [id]
        );

        if (supplements.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: '영양제를 찾을 수 없습니다.' } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: supplements[0],
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Supplement GET Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

// PUT: 영양제 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
            product_report_number,
            product_name,
            product_form,
            dosage,
            dosage_unit,
            intake_method,
            default_intake_time,
            default_intake_amount,
            default_intake_unit,
            manufacturer,
            is_active,
        } = body;

        if (!product_name?.trim()) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: '영양제명을 입력해주세요.' } },
                { status: 400 }
            );
        }

        if (product_name.trim().length > 30) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: '영양제명은 30자 이내로 입력해주세요.' } },
                { status: 400 }
            );
        }

        // 영양제 수정
        const result = await appQuery<{ id: string }>(
            `UPDATE public.supplement_products_master SET
        product_report_number = $1,
        product_name = $2,
        form_unit = $3,
        single_dose = $4,
        dosage_unit = $5,
        intake_method = $6,
        default_intake_time = $7,
        default_intake_amount = $8,
        default_intake_unit = $9,
        manufacturer = $10,
        is_active = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING id`,
            [
                product_report_number || null,
                product_name.trim(),
                product_form || '정',
                dosage || null,
                dosage_unit || 'mg',
                intake_method || null,
                default_intake_time || '00:00',
                default_intake_amount || '1',
                default_intake_unit || '정',
                manufacturer || null,
                is_active !== undefined ? is_active : true,
                id,
            ]
        );

        if (result.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: '영양제를 찾을 수 없습니다.' } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { id: result[0].id },
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Supplement PUT Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

