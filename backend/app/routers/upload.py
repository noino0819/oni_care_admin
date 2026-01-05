# ============================================
# 파일 업로드 API 라우터
# ============================================
# 이미지 업로드

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger
from app.config.settings import settings


router = APIRouter(prefix="/api/v1/admin/upload", tags=["Upload"])

# 허용 파일 타입
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
# 최대 파일 크기 (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024


def get_upload_dir() -> Path:
    """업로드 디렉토리 경로 반환"""
    return Path(os.getcwd()) / "uploads"


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(default="contents"),
    current_user=Depends(get_current_user)
):
    """
    이미지 파일 업로드
    """
    try:
        # 파일 검증
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "파일이 없습니다."}
            )
        
        # 파일 타입 검증
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "허용되지 않는 파일 형식입니다."}
            )
        
        # 파일 읽기
        content = await file.read()
        
        # 파일 크기 검증
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "파일 크기는 5MB를 초과할 수 없습니다."}
            )
        
        # 고유한 파일명 생성
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_str = uuid.uuid4().hex[:8]
        filename = f"{timestamp}_{random_str}.{ext}"
        
        # 업로드 디렉토리 생성
        upload_dir = get_upload_dir() / folder
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 파일 저장
        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
        
        # URL 생성
        url = f"/uploads/{folder}/{filename}"
        
        logger.info(f"파일 업로드 완료: {file_path}")
        
        return {
            "success": True,
            "data": {
                "url": url,
                "filename": filename,
                "originalName": file.filename,
                "size": len(content),
                "mimeType": file.content_type,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"파일 업로드 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

