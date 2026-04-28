# ============================================
# 개인정보 마스킹 공용 유틸
# ============================================
# 회원 개인정보(email, name, phone)를 응답 직전에 마스킹 처리.
# 어드민 화면에서 마스킹 표기는 되지만 응답값에는 평문이 노출되는
# "정보 누출" 취약점 대응 - 화면이 아닌 서버 응답 시점에 마스킹.

import re
from typing import Optional, Iterable, Any, Dict, List


def mask_email(email: Optional[str]) -> Optional[str]:
    """이메일 마스킹 (앞 3자만 보여주고 ***)"""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    masked_local = local[:3] + "***" if len(local) > 3 else local[:1] + "***"
    return f"{masked_local}@{domain}"


def mask_name(name: Optional[str]) -> Optional[str]:
    """이름 마스킹 (홍**동 / 김*동 / 김*)"""
    if not name:
        return name
    if len(name) == 1:
        return name
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def mask_phone(phone: Optional[str]) -> Optional[str]:
    """전화번호 마스킹 (010-****-1234)"""
    if not phone:
        return phone
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11:
        return f"{digits[:3]}-****-{digits[7:]}"
    if len(digits) == 10:
        return f"{digits[:3]}-***-{digits[6:]}"
    if len(phone) >= 7:
        return phone[:3] + "****" + phone[-4:]
    return phone


def mask_user_id(user_id: Optional[str]) -> Optional[str]:
    """사용자 ID(이메일/UUID) 앞 4자리만 노출"""
    if not user_id:
        return user_id
    if len(user_id) <= 4:
        return user_id
    return user_id[:4] + "*" * min(6, len(user_id) - 4)


# 마스킹 대상 필드 정의 (필드명: 마스킹 함수)
# - 어드민/그리팅-X 관리자 회원 목록 응답에도 동일 정책을 적용하기 위해
#   login_id / employee_name 도 기본 마스커에 포함한다.
_DEFAULT_FIELD_MASKERS = {
    "email": mask_email,
    "user_email": mask_email,
    "customer_email": mask_email,
    "name": mask_name,
    "user_name": mask_name,
    "customer_name": mask_name,
    "customer_name_display": mask_name,
    "employee_name": mask_name,
    "phone": mask_phone,
    "user_phone": mask_phone,
    "customer_phone": mask_phone,
    "login_id": mask_user_id,
}


def mask_record(
    record: Optional[Dict[str, Any]],
    fields: Optional[Iterable[str]] = None,
    sensitive_fields_to_drop: Iterable[str] = ("password_hash", "password"),
) -> Optional[Dict[str, Any]]:
    """
    단일 레코드(dict)에 마스킹 적용.

    Args:
        record: 응답 dict (예: 회원/쿠폰/식사기록/포인트 1건)
        fields: 마스킹할 필드 목록 (None이면 _DEFAULT_FIELD_MASKERS 모든 키 검사)
        sensitive_fields_to_drop: 응답에서 제거할 매우 민감한 필드

    Returns:
        마스킹 적용된 dict (원본 비변경, 새 dict 반환)
    """
    if record is None:
        return None
    result = dict(record)
    target_fields = fields if fields is not None else _DEFAULT_FIELD_MASKERS.keys()
    for field in target_fields:
        if field in result and result[field] is not None:
            masker = _DEFAULT_FIELD_MASKERS.get(field)
            if masker:
                result[field] = masker(result[field])
    for field in sensitive_fields_to_drop:
        result.pop(field, None)
    return result


def mask_records(
    records: Optional[List[Dict[str, Any]]],
    fields: Optional[Iterable[str]] = None,
) -> List[Dict[str, Any]]:
    """레코드 목록에 일괄 마스킹 적용."""
    if not records:
        return []
    return [mask_record(r, fields) for r in records]
