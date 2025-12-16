'use server';

// ============================================
// 대시보드 API - 종합 통계 조회
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 앱 이용 현황
async function getAppUsageStats() {
  // DAU: 오늘 접속한 사용자 수
  const dauResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE DATE(last_login) = CURRENT_DATE AND status = 'active'
  `);
  const dau = parseInt(dauResult[0]?.count || '0');

  // 전일 DAU
  const prevDauResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE DATE(last_login) = CURRENT_DATE - INTERVAL '1 day' AND status = 'active'
  `);
  const prevDau = parseInt(prevDauResult[0]?.count || '0');

  // MAU: 최근 30일 접속 사용자
  const mauResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE last_login >= CURRENT_DATE - INTERVAL '30 days' AND status = 'active'
  `);
  const mau = parseInt(mauResult[0]?.count || '0');

  // 전월 MAU
  const prevMauResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE last_login >= CURRENT_DATE - INTERVAL '60 days' 
      AND last_login < CURRENT_DATE - INTERVAL '30 days' 
      AND status = 'active'
  `);
  const prevMau = parseInt(prevMauResult[0]?.count || '0');

  // 신규 가입자: 최근 7일
  const newUsersResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);
  const newUsers = parseInt(newUsersResult[0]?.count || '0');

  // 전주 신규 가입자
  const prevNewUsersResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days'
  `);
  const prevNewUsers = parseInt(prevNewUsersResult[0]?.count || '0');

  // 이탈 사용자: 30일 이상 미접속
  const churnResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE status = 'active' 
      AND (last_login < CURRENT_DATE - INTERVAL '30 days' OR last_login IS NULL)
  `);
  const churnUsers = parseInt(churnResult[0]?.count || '0');

  // 전월 이탈 사용자
  const prevChurnResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE status = 'active' 
      AND (last_login < CURRENT_DATE - INTERVAL '60 days' OR last_login IS NULL)
  `);
  const prevChurnUsers = parseInt(prevChurnResult[0]?.count || '0');

  return {
    dau: {
      value: dau,
      change: dau - prevDau,
      changePercent: prevDau > 0 ? Math.round(((dau - prevDau) / prevDau) * 100 * 10) / 10 : 0,
    },
    mau: {
      value: mau,
      change: mau - prevMau,
      changePercent: prevMau > 0 ? Math.round(((mau - prevMau) / prevMau) * 100 * 10) / 10 : 0,
    },
    newUsers: {
      value: newUsers,
      change: newUsers - prevNewUsers,
      changePercent: prevNewUsers > 0 ? Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100 * 10) / 10 : 0,
    },
    churnUsers: {
      value: churnUsers,
      change: churnUsers - prevChurnUsers,
      changePercent: prevChurnUsers > 0 ? Math.round(((churnUsers - prevChurnUsers) / prevChurnUsers) * 100 * 10) / 10 : 0,
    },
  };
}

// 주요 기능 사용 현황 (최근 7일)
async function getFeatureUsageStats() {
  // 식사기록
  const mealResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM meals 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);

  const prevMealResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM meals 
    WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days'
  `);

  // 영양제 기록
  const supplementResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM supplement_logs 
    WHERE is_taken = true AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);

  const prevSupplementResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM supplement_logs 
    WHERE is_taken = true 
      AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days'
  `);

  // 챗봇 상담
  const chatbotResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM chatbot_conversations 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);

  const prevChatbotResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM chatbot_conversations 
    WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days'
  `);

  // 컨텐츠 조회
  const contentResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM content_read_history 
    WHERE read_at >= CURRENT_DATE - INTERVAL '7 days'
  `);

  const prevContentResult = await query<{ count: string; users: string }>(`
    SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as users
    FROM content_read_history 
    WHERE read_at >= CURRENT_DATE - INTERVAL '14 days'
      AND read_at < CURRENT_DATE - INTERVAL '7 days'
  `);

  const calcChange = (curr: string, prev: string) => {
    const currNum = parseInt(curr || '0');
    const prevNum = parseInt(prev || '0');
    return {
      value: currNum,
      change: currNum - prevNum,
      changePercent: prevNum > 0 ? Math.round(((currNum - prevNum) / prevNum) * 100 * 10) / 10 : 0,
    };
  };

  return [
    {
      name: '식사기록',
      usageCount: calcChange(mealResult[0]?.count, prevMealResult[0]?.count),
      userCount: calcChange(mealResult[0]?.users, prevMealResult[0]?.users),
    },
    {
      name: '영양제 기록',
      usageCount: calcChange(supplementResult[0]?.count, prevSupplementResult[0]?.count),
      userCount: calcChange(supplementResult[0]?.users, prevSupplementResult[0]?.users),
    },
    {
      name: '챗봇 상담',
      usageCount: calcChange(chatbotResult[0]?.count, prevChatbotResult[0]?.count),
      userCount: calcChange(chatbotResult[0]?.users, prevChatbotResult[0]?.users),
    },
    {
      name: '컨텐츠 조회',
      usageCount: calcChange(contentResult[0]?.count, prevContentResult[0]?.count),
      userCount: calcChange(contentResult[0]?.users, prevContentResult[0]?.users),
    },
  ];
}

// 컨텐츠 조회 현황
async function getContentViewStats() {
  const result = await query<{
    category_type: string;
    category_name: string;
    weekly_views: string;
    monthly_views: string;
    total_views: string;
  }>(`
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
  `);

  const categoryTypeMap: Record<string, string> = {
    interest: '관심사',
    disease: '질병',
    exercise: '운동',
  };

  return result.map(row => ({
    categoryType: categoryTypeMap[row.category_type] || row.category_type,
    categoryName: row.category_name,
    weeklyViews: parseInt(row.weekly_views || '0'),
    monthlyViews: parseInt(row.monthly_views || '0'),
    totalViews: parseInt(row.total_views || '0'),
  }));
}

// 문의 게시판 (최근 6건)
async function getInquiries() {
  const result = await query<{
    id: string;
    inquiry_type_name: string;
    content: string;
    status: string;
    created_at: string;
  }>(`
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
  `);

  return result.map(row => ({
    id: row.id,
    inquiryType: row.inquiry_type_name,
    content: row.content.length > 20 ? row.content.substring(0, 20) + '...' : row.content,
    status: row.status,
  }));
}

// 포인트 현황
async function getPointStats() {
  // 누적 발급 포인트
  const totalResult = await query<{ total: string; min_date: string; max_date: string }>(`
    SELECT 
      COALESCE(SUM(points), 0) as total,
      TO_CHAR(MIN(created_at), 'YYYY.MM.DD') as min_date,
      TO_CHAR(MAX(created_at), 'YYYY.MM.DD') as max_date
    FROM point_history 
    WHERE transaction_type = 'earn'
  `);

  // 월간 발급 포인트
  const monthlyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  const prevMonthlyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
  `);

  // 주간 발급 포인트
  const weeklyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  `);

  const prevWeeklyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days'
  `);

  // 일간 발급 포인트
  const dailyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= CURRENT_DATE
  `);

  const prevDailyResult = await query<{ total: string }>(`
    SELECT COALESCE(SUM(points), 0) as total
    FROM point_history 
    WHERE transaction_type = 'earn' 
      AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE
  `);

  // 전환 유형별 (source별 그룹핑 - 일/주/월/누적)
  const conversionResult = await query<{
    source: string;
    daily_amount: string;
    weekly_amount: string;
    monthly_amount: string;
    total_amount: string;
  }>(`
    SELECT 
      source,
      COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN points ELSE 0 END), 0) as daily_amount,
      COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN points ELSE 0 END), 0) as weekly_amount,
      COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN points ELSE 0 END), 0) as monthly_amount,
      COALESCE(SUM(points), 0) as total_amount
    FROM point_history 
    WHERE transaction_type = 'use'
    GROUP BY source
  `);

  const calcChangePercent = (curr: string, prev: string) => {
    const currNum = parseInt(curr || '0');
    const prevNum = parseInt(prev || '0');
    if (prevNum === 0) return 0;
    return Math.round(((currNum - prevNum) / prevNum) * 100 * 10) / 10;
  };

  // 기본 전환 유형
  const defaultConversions = ['H.point', '스푼', 'GR쿠폰', '그리너리'];
  const conversions = defaultConversions.map(type => {
    const found = conversionResult.find(r => r.source === type);
    return {
      type,
      daily: parseInt(found?.daily_amount || '0'),
      weekly: parseInt(found?.weekly_amount || '0'),
      monthly: parseInt(found?.monthly_amount || '0'),
      total: parseInt(found?.total_amount || '0'),
    };
  });

  return {
    total: {
      value: parseInt(totalResult[0]?.total || '0'),
      period: totalResult[0]?.min_date && totalResult[0]?.max_date 
        ? `${totalResult[0].min_date}~${totalResult[0].max_date}` 
        : '',
    },
    monthly: {
      value: parseInt(monthlyResult[0]?.total || '0'),
      changePercent: calcChangePercent(monthlyResult[0]?.total, prevMonthlyResult[0]?.total),
    },
    weekly: {
      value: parseInt(weeklyResult[0]?.total || '0'),
      changePercent: calcChangePercent(weeklyResult[0]?.total, prevWeeklyResult[0]?.total),
    },
    daily: {
      value: parseInt(dailyResult[0]?.total || '0'),
      changePercent: calcChangePercent(dailyResult[0]?.total, prevDailyResult[0]?.total),
    },
    conversions,
  };
}

// 챌린지 진행 현황
async function getChallengeStats() {
  const challengeTypes = [
    { type: 'attendance', name: '출석체크' },
    { type: 'steps', name: '걸음수' },
    { type: 'meal', name: '식사기록' },
    { type: 'supplement', name: '영양제기록' },
    { type: 'nutrition_diagnosis', name: '영양설문' },
    { type: 'health_habit', name: '건강습관' },
    { type: 'quiz', name: '퀴즈' },
  ];

  const targetTypes = ['전체', 'FS', '제휴', '스토어'];

  const result = await query<{
    challenge_type: string;
    is_fs_member: boolean;
    has_business_code: boolean;
    count: string;
  }>(`
    SELECT 
      c.challenge_type,
      u.is_fs_member,
      (u.business_code IS NOT NULL) as has_business_code,
      COUNT(*) as count
    FROM challenge_participants cp
    JOIN challenges c ON cp.challenge_id = c.id
    JOIN users u ON cp.user_id = u.id
    WHERE cp.status = 'participating'
    GROUP BY c.challenge_type, u.is_fs_member, has_business_code
  `);

  const stats = targetTypes.map(target => {
    const row: Record<string, number> = { target: 0 };
    
    challengeTypes.forEach(ct => {
      let count = 0;
      result.forEach(r => {
        if (r.challenge_type !== ct.type) return;
        
        if (target === '전체') {
          count += parseInt(r.count);
        } else if (target === 'FS' && r.is_fs_member) {
          count += parseInt(r.count);
        } else if (target === '제휴' && r.has_business_code && !r.is_fs_member) {
          count += parseInt(r.count);
        } else if (target === '스토어' && !r.has_business_code && !r.is_fs_member) {
          count += parseInt(r.count);
        }
      });
      row[ct.type] = count;
    });

    return { target, ...row };
  });

  return {
    columns: challengeTypes.map(ct => ct.name),
    data: stats,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [
      appUsage,
      featureUsage,
      contentViews,
      inquiries,
      points,
      challenges,
    ] = await Promise.all([
      getAppUsageStats(),
      getFeatureUsageStats(),
      getContentViewStats(),
      getInquiries(),
      getPointStats(),
      getChallengeStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        appUsage,
        featureUsage,
        contentViews,
        inquiries,
        points,
        challenges,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

