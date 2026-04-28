# ============================================
# 공용 검증 유틸리티
# ============================================
# 이미지 URL, 링크 URL 등 서버측 검증 함수
# 첨부파일/링크 경로를 외부 악성 URL로 변조하는 공격을 방어한다.

from typing import Optional, List, Dict, Any

from app.core.exceptions import ValidationError


def validate_image_url(url: Optional[str]) -> Optional[str]:
    """
    이미지 URL 서버측 검증 (프로세스 검증 누락 취약점 대응)
    내부 상대 경로만 허용, 외부 URL 차단

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
    if url.startswith("http://") or url.startswith("https://"):
        raise ValidationError(
            "외부 URL은 허용되지 않습니다. 내부 업로드 경로만 사용 가능합니다."
        )
    if url.startswith("/"):
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


def validate_image_urls_dict(images: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    이미지 URL 객체(JSON) 일괄 검증.
    예) ChallengeImages 처럼 thumbnail/banner 등 여러 필드를 가진 dict.

    문자열 값은 단일 URL, 리스트 값은 URL 리스트로 간주하여 모두 검증한다.

    Args:
        images: { "thumbnail": "/uploads/...", "detail_pages": ["/uploads/.."] }

    Returns:
        검증된 dict (원본 비변경)
    """
    if images is None:
        return None
    if not isinstance(images, dict):
        raise ValidationError("이미지 정보 형식이 올바르지 않습니다.")
    validated: Dict[str, Any] = {}
    for key, value in images.items():
        if value is None:
            validated[key] = None
        elif isinstance(value, str):
            validated[key] = validate_image_url(value)
        elif isinstance(value, list):
            validated[key] = validate_image_urls(value)
        else:
            raise ValidationError(f"'{key}' 필드 형식이 올바르지 않습니다.")
    return validated


# 푸시 link_url에서 허용하는 앱 내부 딥링크 스킴
_ALLOWED_DEEPLINK_SCHEMES = ("greatingcare://", "app://")


def validate_roulette_segments(
    segments: Optional[List[Dict[str, Any]]],
) -> Optional[List[Dict[str, Any]]]:
    """
    룰렛 세그먼트 화이트리스트 검증 (프로세스 검증 누락 취약점 대응).

    프론트가 보내는 정상 segment 형태:
        { label, probability, reward_type, reward_value }

    모델이 List[dict] 라서 임의 키(image_url 등)가 통과해 DB에 그대로
    저장되는 위험이 있어, 허용된 키 외에는 모두 제거한다.
    """
    if segments is None:
        return None
    if not isinstance(segments, list):
        raise ValidationError("룰렛 세그먼트 형식이 올바르지 않습니다.")

    allowed_keys = {
        "slot",
        "is_active",
        "label",
        "display_text",
        "probability",
        "reward_type",
        "reward_value",
        "daily_max_quantity",
        "total_max_quantity",
    }
    allowed_reward_types = {"point", "coupon"}

    cleaned: List[Dict[str, Any]] = []
    for idx, seg in enumerate(segments):
        if not isinstance(seg, dict):
            raise ValidationError(f"{idx + 1}번 룰렛 세그먼트 형식이 올바르지 않습니다.")
        clean: Dict[str, Any] = {k: v for k, v in seg.items() if k in allowed_keys}

        # reward_type 화이트리스트
        rt = clean.get("reward_type")
        if rt is not None and rt not in allowed_reward_types:
            raise ValidationError("허용되지 않는 보상 종류입니다.")

        # 표시 문구 길이 제한
        for text_key in ("label", "display_text"):
            text = clean.get(text_key)
            if isinstance(text, str) and len(text) > 30:
                raise ValidationError("룰렛 표시 문구는 30자 이내여야 합니다.")
            # HTML 태그 차단(저장 단계에서 무력화)
            if isinstance(text, str) and ("<" in text or ">" in text):
                raise ValidationError("룰렛 표시 문구에 허용되지 않는 문자가 포함되어 있습니다.")

        cleaned.append(clean)
    return cleaned


def validate_link_url(url: Optional[str]) -> Optional[str]:
    """
    링크 URL 서버측 검증 (푸시/배너 등 사용자가 누르면 이동하는 URL).
    외부 임의 URL을 차단하여 피싱/악성 사이트로 유도되는 것을 방지한다.

    허용:
        - 빈 값
        - 내부 상대 경로 (/로 시작)
        - 정의된 앱 딥링크 스킴 (greatingcare://, app://)

    차단:
        - http:// / https:// 등 외부 URL
        - .. 등 경로 조작 문자
        - javascript: / data: / file: 등 위험 스킴
    """
    if not url or not url.strip():
        return None
    url = url.strip()

    if ".." in url or "\\" in url:
        raise ValidationError("유효하지 않은 링크입니다.")

    lower = url.lower()
    if lower.startswith(("javascript:", "data:", "file:", "vbscript:")):
        raise ValidationError("허용되지 않는 링크 형식입니다.")

    if lower.startswith(_ALLOWED_DEEPLINK_SCHEMES):
        return url

    if url.startswith("http://") or url.startswith("https://"):
        raise ValidationError(
            "외부 링크는 허용되지 않습니다. 앱 내부 경로 또는 딥링크만 사용 가능합니다."
        )

    if url.startswith("/"):
        return url

    raise ValidationError(
        "외부 링크는 허용되지 않습니다. 앱 내부 경로 또는 딥링크만 사용 가능합니다."
    )
