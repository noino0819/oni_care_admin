// ============================================
// 이미지 업로드 API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'contents';

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '파일이 없습니다.' } },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '허용되지 않는 파일 형식입니다.' } },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '파일 크기는 5MB를 초과할 수 없습니다.' } },
        { status: 400 }
      );
    }

    // 고유한 파일명 생성
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}_${randomStr}.${ext}`;

    // 업로드 디렉토리 생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일 저장
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // URL 반환
    const url = `/uploads/${folder}/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Upload API Error]', error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

