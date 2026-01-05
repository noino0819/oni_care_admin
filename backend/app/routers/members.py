# ============================================
# 회원 API 라우터
# ============================================
# 회원 목록 조회 (App DB)

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/members", tags=["Members"])


def get_member_type(is_fs_member: bool, business_code: Optional[str]) -> str:
    """회원 타입 반환"""
    if is_fs_member:
        return "FS"
    elif business_code:
        return "제휴사"
    return "일반"


@router.get("")
async def get_members(
    name: Optional[str] = Query(None, description="이름"),
    id: Optional[str] = Query(None, alias="id", description="아이디(이메일)"),
    birth_year: Optional[int] = Query(None, description="생년"),
    birth_month: Optional[int] = Query(None, description="생월"),
    birth_day: Optional[int] = Query(None, description="생일"),
    gender: Optional[str] = Query(None, description="성별"),
    member_types: Optional[str] = Query(None, description="회원유형 (쉼표 구분: normal,affiliate,fs)"),
    phone: Optional[str] = Query(None, description="전화번호"),
    business_code: Optional[str] = Query(None, description="사업장코드"),
    created_from: Optional[str] = Query(None, description="가입일 시작"),
    created_to: Optional[str] = Query(None, description="가입일 종료"),
    sort_field: str = Query("created_at", description="정렬 필드"),
    sort_direction: str = Query("desc", description="정렬 방향"),
    page: int = Query(1, ge=1, description="페이지"),
    limit: int = Query(20, ge=1, le=100, description="페이지 크기"),
    current_user=Depends(get_current_user)
):
    """
    회원 목록 조회 (App DB)
    """
    try:
        conditions = ["status = 'active'"]
        params = {}
        
        if name:
            conditions.append("name ILIKE %(name)s")
            params["name"] = f"%{name}%"
        
        if id:
            conditions.append("email ILIKE %(email)s")
            params["email"] = f"%{id}%"
        
        # 생년월일 조건
        if birth_year:
            conditions.append("EXTRACT(YEAR FROM birth_date) = %(birth_year)s")
            params["birth_year"] = birth_year
        
        if birth_month:
            conditions.append("EXTRACT(MONTH FROM birth_date) = %(birth_month)s")
            params["birth_month"] = birth_month
        
        if birth_day:
            conditions.append("EXTRACT(DAY FROM birth_date) = %(birth_day)s")
            params["birth_day"] = birth_day
        
        if gender:
            conditions.append("gender = %(gender)s")
            params["gender"] = gender
        
        # 회원 유형
        if member_types:
            type_list = [t.strip() for t in member_types.split(",") if t.strip()]
            if type_list:
                type_conditions = []
                if "normal" in type_list:
                    type_conditions.append("(is_fs_member = false AND business_code IS NULL)")
                if "affiliate" in type_list:
                    type_conditions.append("(is_fs_member = false AND business_code IS NOT NULL)")
                if "fs" in type_list:
                    type_conditions.append("is_fs_member = true")
                if type_conditions:
                    conditions.append(f"({' OR '.join(type_conditions)})")
        
        if phone:
            # 숫자만 추출해서 검색
            import re
            clean_phone = re.sub(r'\D', '', phone)
            conditions.append("phone ILIKE %(phone)s")
            params["phone"] = f"%{clean_phone}%"
        
        if business_code:
            conditions.append("business_code ILIKE %(business_code)s")
            params["business_code"] = f"%{business_code}%"
        
        if created_from:
            conditions.append("created_at >= %(created_from)s")
            params["created_from"] = created_from
        
        if created_to:
            conditions.append("created_at <= %(created_to)s")
            params["created_to"] = created_to + " 23:59:59"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 정렬 검증
        allowed_sort_fields = ["email", "name", "birth_date", "gender", "business_code", "phone", "created_at"]
        safe_field = sort_field if sort_field in allowed_sort_fields else "created_at"
        safe_direction = "ASC" if sort_direction.upper() == "ASC" else "DESC"
        
        # 전체 개수 조회 (App DB)
        count_sql = f"SELECT COUNT(*) as count FROM users {where_clause}"
        count_result = await query_one(count_sql, params, use_app_db=True)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        members = await query(
            f"""
            SELECT id, email, name, birth_date, gender, is_fs_member, business_code, phone, created_at
            FROM users
            {where_clause}
            ORDER BY {safe_field} {safe_direction}
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
            use_app_db=True
        )
        
        # 회원 유형 라벨 추가
        formatted_members = []
        for m in members:
            formatted_members.append({
                **m,
                "member_type": get_member_type(m.get("is_fs_member", False), m.get("business_code"))
            })
        
        return {
            "success": True,
            "data": formatted_members,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    except Exception as e:
        logger.error(f"회원 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )


@router.get("/{member_id}")
async def get_member(
    member_id: str,
    current_user=Depends(get_current_user)
):
    """
    회원 상세 조회 (App DB)
    """
    try:
        member = await query_one(
            "SELECT * FROM users WHERE id = %(member_id)s",
            {"member_id": member_id},
            use_app_db=True
        )
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "회원을 찾을 수 없습니다."}
            )
        
        member["member_type"] = get_member_type(
            member.get("is_fs_member", False), 
            member.get("business_code")
        )
        
        return ApiResponse(success=True, data=member)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회원 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

