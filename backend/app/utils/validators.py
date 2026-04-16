# ============================================
# 공용 검증 유틸리티
# ============================================
# 이미지 URL, 경로 등 서버측 검증 함수

from typing import Optional, List

from app.core.exceptions import ValidationError


def validate_image_url(url: Optional[str]) -> Optional[str]:
    """
    이미지 URL 서버측 검증 (프로세스 검증 누락 취약점 대응)
    내부 업로드 경로만 허용, 외부 URL 차단

    Args:
        url: 검증할 이미지 URL

    Returns:
        검증된 URL 또는 None

    Raises:
        ValidationError: 외부 URL이거나 경로 조작 시도 시
    """
    if not url or not url.strip():
        return None
    url = url.strip()
    if ".." in url or "\\" in url:
        raise ValidationError("유효하지 않은 이미지 경로입니다.")
    if url.startswith("/uploads/") or url.startswith("/images/"):
        return url
    raise ValidationError(
        "외부 URL은 허용되지 않습니다. 내부 업로드 경로만 사용 가능합니다."
    )


def validate_image_urls(urls: Optional[List[str]]) -> Optional[List[str]]:
    """
    이미지 URL 목록 서버측 검증

    Args:
        urls: 검증할 이미지 URL 목록

    Returns:
        검증된 URL 목록 또는 None
    """
    if urls is None:
        return None
    return [validate_image_url(url) for url in urls if url]
