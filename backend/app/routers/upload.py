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

# 허용 MIME 타입
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
# 허용 확장자 (MIME과 별도로 확장자도 검증 - 보안 취약점 대응)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
# 최대 파일 크기 (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024
# 이미지 매직 바이트 시그니처
IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': "jpg",
    b'\x89PNG': "png",
    b'GIF87a': "gif",
    b'GIF89a': "gif",
    b'RIFF': "webp",
}


def get_upload_dir() -> Path:
    """업로드 디렉토리 경로 반환"""
    # backend/uploads 디렉토리 사용
    return Path(__file__).parent.parent.parent / "uploads"


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
        
        # MIME 타입 검증
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "허용되지 않는 파일 형식입니다. (jpg, png, gif, webp만 허용)"}
            )
        
        # 확장자 검증 (MIME과 별도 - 클라이언트가 MIME을 조작할 수 있으므로)
        original_ext = ""
        if file.filename and "." in file.filename:
            original_ext = file.filename.rsplit(".", 1)[-1].lower()
        if original_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "허용되지 않는 파일 확장자입니다. (jpg, png, gif, webp만 허용)"}
            )
        
        # 파일 읽기
        content = await file.read()
        
        # 파일 크기 검증
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "파일 크기는 5MB를 초과할 수 없습니다."}
            )
        
        # 매직 바이트 검증 (실제 이미지 파일인지 확인)
        is_valid_image = False
        for signature in IMAGE_SIGNATURES:
            if content[:len(signature)] == signature:
                is_valid_image = True
                break
        if not is_valid_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유효한 이미지 파일이 아닙니다."}
            )
        
        # 고유한 파일명 생성 (확장자는 검증된 값만 사용)
        ext = original_ext if original_ext in ALLOWED_EXTENSIONS else "jpg"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_str = uuid.uuid4().hex[:8]
        filename = f"{timestamp}_{random_str}.{ext}"
        
        # 폴더 경로 조작 방지 (상위 디렉토리 이동 차단)
        safe_folder = folder.replace("..", "").replace("\\", "/").strip("/")
        if not safe_folder or "/" in safe_folder.replace(safe_folder.split("/")[0], "", 1).lstrip("/"):
            safe_folder = "contents"
        
        # 업로드 디렉토리 생성
        upload_dir = get_upload_dir() / safe_folder
        resolved = upload_dir.resolve()
        if not str(resolved).startswith(str(get_upload_dir().resolve())):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "유효하지 않은 업로드 경로입니다."}
            )
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 파일 저장
        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
        
        # URL 생성
        url = f"/uploads/{safe_folder}/{filename}"
        
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


