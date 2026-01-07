// ============================================
// 영양제 DB 관리 API (목록 조회/등록)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { appQuery, withAppTransaction } from '@/lib/app-db';
import { verifyToken, extractToken } from '@/lib/auth';

// GET: 영양제 목록 조회
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

        // 필터 조건
        const productName = searchParams.get('product_name');
        const reportNumber = searchParams.get('report_number');
        const ingredientName = searchParams.get('ingredient_name');
        const functionality = searchParams.get('functionality');
        const defaultIntakeAmount = searchParams.get('default_intake_amount');
        const defaultIntakeTime = searchParams.get('default_intake_time');
        const productForm = searchParams.get('product_form');
        const manufacturer = searchParams.get('manufacturer');
        const isActive = searchParams.get('is_active');

        // 동적 쿼리 빌드
        const conditions: string[] = [];
        const params: (string | number | boolean)[] = [];
        let paramIndex = 1;

        if (productName) {
            conditions.push(`s.product_name ILIKE $${paramIndex}`);
            params.push(`%${productName}%`);
            paramIndex++;
        }

        if (reportNumber) {
            conditions.push(`s.product_report_number ILIKE $${paramIndex}`);
            params.push(`%${reportNumber}%`);
            paramIndex++;
        }

        if (ingredientName) {
            conditions.push(`EXISTS (
        SELECT 1 FROM public.product_ingredient_mapping pim
        JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
        WHERE pim.product_id = s.id 
        AND (fi.internal_name ILIKE $${paramIndex} OR fi.external_name ILIKE $${paramIndex})
      )`);
            params.push(`%${ingredientName}%`);
            paramIndex++;
        }

        if (functionality) {
            conditions.push(`EXISTS (
        SELECT 1 FROM public.product_ingredient_mapping pim
        JOIN public.functional_ingredients fi ON pim.ingredient_id = fi.id
        JOIN public.ingredient_functionality_mapping ifm ON fi.id = ifm.ingredient_id
        JOIN public.functionality_contents fc ON ifm.functionality_id = fc.id
        WHERE pim.product_id = s.id AND fc.content ILIKE $${paramIndex}
      )`);
            params.push(`%${functionality}%`);
            paramIndex++;
        }

        if (defaultIntakeAmount) {
            conditions.push(`s.default_intake_amount = $${paramIndex}`);
            params.push(parseFloat(defaultIntakeAmount));
            paramIndex++;
        }

        if (defaultIntakeTime) {
            conditions.push(`s.default_intake_time = $${paramIndex}`);
            params.push(defaultIntakeTime);
            paramIndex++;
        }

        if (productForm) {
            conditions.push(`s.product_form = $${paramIndex}`);
            params.push(productForm);
            paramIndex++;
        }

        if (manufacturer) {
            conditions.push(`s.manufacturer ILIKE $${paramIndex}`);
            params.push(`%${manufacturer}%`);
            paramIndex++;
        }

        if (isActive === 'Y') {
            conditions.push(`s.is_active = true`);
        } else if (isActive === 'N') {
            conditions.push(`s.is_active = false`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 전체 개수 조회
        const countResult = await appQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM public.supplement_products_master s ${whereClause}`,
            params
        );
        const total = parseInt(countResult[0]?.count || '0');

        // 영양제 목록 조회
        const supplements = await appQuery<{
            id: string;
            product_report_number: string | null;
            product_name: string;
            product_form: string | null;
            dosage: number | null;
            dosage_unit: string | null;
            intake_method: string | null;
            default_intake_time: string | null;
            default_intake_amount: number | null;
            default_intake_unit: string | null;
            manufacturer: string | null;
            is_active: boolean;
            created_at: string;
            updated_at: string;
        }>(
            `SELECT 
        s.id, s.product_report_number, s.product_name, s.product_form,
        s.dosage, s.dosage_unit, s.intake_method, s.default_intake_time,
        s.default_intake_amount, s.default_intake_unit, s.manufacturer,
        s.is_active, s.created_at, s.updated_at
       FROM public.supplement_products_master s
       ${whereClause}
       ORDER BY s.updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, pageSize, offset]
        );

        return NextResponse.json({
            success: true,
            data: supplements,
            pagination: {
                page,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Supplements API Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

// POST: 영양제 등록
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
            is_active = true,
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

        const adminName = payload.name || payload.email || 'admin';

        // 영양제 등록
        const result = await appQuery<{ id: string }>(
            `INSERT INTO public.supplement_products_master (
        product_report_number, product_name, product_form, dosage, dosage_unit,
        intake_method, default_intake_time, default_intake_amount, default_intake_unit,
        manufacturer, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING id`,
            [
                product_report_number || null,
                product_name.trim(),
                product_form || null,
                dosage || null,
                dosage_unit || 'mg',
                intake_method || null,
                default_intake_time || '00:00',
                default_intake_amount || 1,
                default_intake_unit || '정',
                manufacturer || null,
                is_active,
                adminName,
            ]
        );

        return NextResponse.json({
            success: true,
            data: { id: result[0]?.id },
        }, { status: 201 });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Supplements POST Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

// DELETE: 영양제 삭제 (다건)
export async function DELETE(request: NextRequest) {
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
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: '삭제할 항목을 선택해주세요.' } },
                { status: 400 }
            );
        }

        // 삭제 (CASCADE로 매핑 데이터도 함께 삭제됨)
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        await appQuery(
            `DELETE FROM public.supplement_products_master WHERE id IN (${placeholders})`,
            ids
        );

        return NextResponse.json({
            success: true,
            data: { deleted: ids.length },
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Supplements DELETE Error]', error);
        }
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
            { status: 500 }
        );
    }
}

