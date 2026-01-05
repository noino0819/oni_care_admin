# ============================================
# 대시보드 API 라우터
# ============================================
# 대시보드 통계 조회 (App DB)

from fastapi import APIRouter, Depends, HTTPException, status

from app.config.database import query, query_one
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/dashboard", tags=["Dashboard"])


def calc_change(curr_val: int, prev_val: int) -> dict:
    """변화량 및 변화율 계산"""
    change = curr_val - prev_val
    change_percent = round((change / prev_val) * 100, 1) if prev_val > 0 else 0
    return {
        "value": curr_val,
        "change": change,
        "changePercent": change_percent
    }


async def get_app_usage_stats():
    """앱 이용 현황"""
    # DAU: 오늘 접속한 사용자 수
    dau_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE DATE(last_login) = CURRENT_DATE AND status = 'active'",
        use_app_db=True
    )
    dau = int(dau_result.get("count", 0)) if dau_result else 0
    
    # 전일 DAU
    prev_dau_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE DATE(last_login) = CURRENT_DATE - INTERVAL '1 day' AND status = 'active'",
        use_app_db=True
    )
    prev_dau = int(prev_dau_result.get("count", 0)) if prev_dau_result else 0
    
    # MAU: 최근 30일 접속 사용자
    mau_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE last_login >= CURRENT_DATE - INTERVAL '30 days' AND status = 'active'",
        use_app_db=True
    )
    mau = int(mau_result.get("count", 0)) if mau_result else 0
    
    # 전월 MAU
    prev_mau_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE last_login >= CURRENT_DATE - INTERVAL '60 days' AND last_login < CURRENT_DATE - INTERVAL '30 days' AND status = 'active'",
        use_app_db=True
    )
    prev_mau = int(prev_mau_result.get("count", 0)) if prev_mau_result else 0
    
    # 신규 가입자: 최근 7일
    new_users_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    new_users = int(new_users_result.get("count", 0)) if new_users_result else 0
    
    # 전주 신규 가입자
    prev_new_users_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_new_users = int(prev_new_users_result.get("count", 0)) if prev_new_users_result else 0
    
    # 이탈 사용자: 30일 이상 미접속
    churn_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE status = 'active' AND (last_login < CURRENT_DATE - INTERVAL '30 days' OR last_login IS NULL)",
        use_app_db=True
    )
    churn_users = int(churn_result.get("count", 0)) if churn_result else 0
    
    # 전월 이탈 사용자
    prev_churn_result = await query_one(
        "SELECT COUNT(*) as count FROM users WHERE status = 'active' AND (last_login < CURRENT_DATE - INTERVAL '60 days' OR last_login IS NULL)",
        use_app_db=True
    )
    prev_churn_users = int(prev_churn_result.get("count", 0)) if prev_churn_result else 0
    
    return {
        "dau": calc_change(dau, prev_dau),
        "mau": calc_change(mau, prev_mau),
        "newUsers": calc_change(new_users, prev_new_users),
        "churnUsers": calc_change(churn_users, prev_churn_users),
    }


async def get_feature_usage_stats():
    """주요 기능 사용 현황 (최근 7일)"""
    features = []
    
    # 식사기록
    meal_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM meals WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_meal_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM meals WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    features.append({
        "name": "식사기록",
        "usageCount": calc_change(
            int(meal_result.get("count", 0)) if meal_result else 0,
            int(prev_meal_result.get("count", 0)) if prev_meal_result else 0
        ),
        "userCount": calc_change(
            int(meal_result.get("users", 0)) if meal_result else 0,
            int(prev_meal_result.get("users", 0)) if prev_meal_result else 0
        )
    })
    
    # 영양제 기록
    supp_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM supplement_logs WHERE is_taken = true AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_supp_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM supplement_logs WHERE is_taken = true AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    features.append({
        "name": "영양제 기록",
        "usageCount": calc_change(
            int(supp_result.get("count", 0)) if supp_result else 0,
            int(prev_supp_result.get("count", 0)) if prev_supp_result else 0
        ),
        "userCount": calc_change(
            int(supp_result.get("users", 0)) if supp_result else 0,
            int(prev_supp_result.get("users", 0)) if prev_supp_result else 0
        )
    })
    
    # 챗봇 상담
    chat_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM chatbot_conversations WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_chat_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM chatbot_conversations WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    features.append({
        "name": "챗봇 상담",
        "usageCount": calc_change(
            int(chat_result.get("count", 0)) if chat_result else 0,
            int(prev_chat_result.get("count", 0)) if prev_chat_result else 0
        ),
        "userCount": calc_change(
            int(chat_result.get("users", 0)) if chat_result else 0,
            int(prev_chat_result.get("users", 0)) if prev_chat_result else 0
        )
    })
    
    # 컨텐츠 조회
    content_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM content_read_history WHERE read_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_content_result = await query_one(
        "SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users FROM content_read_history WHERE read_at >= CURRENT_DATE - INTERVAL '14 days' AND read_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    features.append({
        "name": "컨텐츠 조회",
        "usageCount": calc_change(
            int(content_result.get("count", 0)) if content_result else 0,
            int(prev_content_result.get("count", 0)) if prev_content_result else 0
        ),
        "userCount": calc_change(
            int(content_result.get("users", 0)) if content_result else 0,
            int(prev_content_result.get("users", 0)) if prev_content_result else 0
        )
    })
    
    return features


async def get_content_view_stats():
    """컨텐츠 조회 현황"""
    result = await query(
        """
        SELECT 
            cc.category_type,
            cc.category_name,
            COALESCE(SUM(CASE WHEN crh.read_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as weekly_views,
            COALESCE(SUM(CASE WHEN crh.read_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END), 0) as monthly_views,
            COALESCE(SUM(c.view_count), 0) as total_views
        FROM content_categories cc
        LEFT JOIN contents c ON c.category_id = cc.id
        LEFT JOIN content_read_history crh ON crh.content_id = c.id
        WHERE cc.is_active = true
        GROUP BY cc.id, cc.category_type, cc.category_name
        ORDER BY weekly_views DESC
        LIMIT 10
        """,
        use_app_db=True
    )
    
    category_type_map = {
        "interest": "관심사",
        "disease": "질병",
        "exercise": "운동",
    }
    
    return [
        {
            "categoryType": category_type_map.get(row.get("category_type"), row.get("category_type")),
            "categoryName": row.get("category_name"),
            "weeklyViews": int(row.get("weekly_views", 0)),
            "monthlyViews": int(row.get("monthly_views", 0)),
            "totalViews": int(row.get("total_views", 0)),
        }
        for row in result
    ]


async def get_inquiries():
    """문의 게시판 (최근 6건)"""
    result = await query(
        """
        SELECT 
            i.id,
            COALESCE(it.name, '기타') as inquiry_type_name,
            i.content,
            i.status,
            i.created_at
        FROM inquiries i
        LEFT JOIN inquiry_types it ON i.inquiry_type_id = it.id
        ORDER BY 
            CASE WHEN i.status = 'pending' THEN 0 ELSE 1 END ASC,
            i.created_at DESC
        LIMIT 6
        """,
        use_app_db=True
    )
    
    return [
        {
            "id": row.get("id"),
            "inquiryType": row.get("inquiry_type_name"),
            "content": (row.get("content", "")[:20] + "...") if len(row.get("content", "")) > 20 else row.get("content", ""),
            "status": row.get("status"),
        }
        for row in result
    ]


async def get_point_stats():
    """포인트 현황"""
    # 누적 발급 포인트
    total_result = await query_one(
        """
        SELECT 
            COALESCE(SUM(points), 0) as total,
            TO_CHAR(MIN(created_at), 'YYYY.MM.DD') as min_date,
            TO_CHAR(MAX(created_at), 'YYYY.MM.DD') as max_date
        FROM point_history 
        WHERE transaction_type = 'earn'
        """,
        use_app_db=True
    )
    
    # 월간 발급 포인트
    monthly_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)",
        use_app_db=True
    )
    prev_monthly_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', CURRENT_DATE)",
        use_app_db=True
    )
    
    # 주간 발급 포인트
    weekly_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    prev_weekly_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'",
        use_app_db=True
    )
    
    # 일간 발급 포인트
    daily_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= CURRENT_DATE",
        use_app_db=True
    )
    prev_daily_result = await query_one(
        "SELECT COALESCE(SUM(points), 0) as total FROM point_history WHERE transaction_type = 'earn' AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
        use_app_db=True
    )
    
    # 전환 유형별
    conversion_result = await query(
        """
        SELECT 
            source,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN points ELSE 0 END), 0) as daily_amount,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN points ELSE 0 END), 0) as weekly_amount,
            COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN points ELSE 0 END), 0) as monthly_amount,
            COALESCE(SUM(points), 0) as total_amount
        FROM point_history 
        WHERE transaction_type = 'use'
        GROUP BY source
        """,
        use_app_db=True
    )
    
    def calc_change_percent(curr: int, prev: int) -> float:
        if prev == 0:
            return 0
        return round(((curr - prev) / prev) * 100, 1)
    
    # 기본 전환 유형
    default_conversions = ["H.point", "스푼", "GR쿠폰", "그리너리"]
    conversions = []
    for conv_type in default_conversions:
        found = next((r for r in conversion_result if r.get("source") == conv_type), None)
        conversions.append({
            "type": conv_type,
            "daily": int(found.get("daily_amount", 0)) if found else 0,
            "weekly": int(found.get("weekly_amount", 0)) if found else 0,
            "monthly": int(found.get("monthly_amount", 0)) if found else 0,
            "total": int(found.get("total_amount", 0)) if found else 0,
        })
    
    return {
        "total": {
            "value": int(total_result.get("total", 0)) if total_result else 0,
            "period": f"{total_result.get('min_date')}~{total_result.get('max_date')}" if total_result and total_result.get("min_date") else "",
        },
        "monthly": {
            "value": int(monthly_result.get("total", 0)) if monthly_result else 0,
            "changePercent": calc_change_percent(
                int(monthly_result.get("total", 0)) if monthly_result else 0,
                int(prev_monthly_result.get("total", 0)) if prev_monthly_result else 0
            ),
        },
        "weekly": {
            "value": int(weekly_result.get("total", 0)) if weekly_result else 0,
            "changePercent": calc_change_percent(
                int(weekly_result.get("total", 0)) if weekly_result else 0,
                int(prev_weekly_result.get("total", 0)) if prev_weekly_result else 0
            ),
        },
        "daily": {
            "value": int(daily_result.get("total", 0)) if daily_result else 0,
            "changePercent": calc_change_percent(
                int(daily_result.get("total", 0)) if daily_result else 0,
                int(prev_daily_result.get("total", 0)) if prev_daily_result else 0
            ),
        },
        "conversions": conversions,
    }


@router.get("")
async def get_dashboard(
    current_user=Depends(get_current_user)
):
    """
    대시보드 종합 통계 조회
    """
    try:
        app_usage = await get_app_usage_stats()
        feature_usage = await get_feature_usage_stats()
        content_views = await get_content_view_stats()
        inquiries = await get_inquiries()
        points = await get_point_stats()
        
        return {
            "success": True,
            "data": {
                "appUsage": app_usage,
                "featureUsage": feature_usage,
                "contentViews": content_views,
                "inquiries": inquiries,
                "points": points,
            }
        }
    except Exception as e:
        logger.error(f"대시보드 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": "서버 오류가 발생했습니다."}
        )

