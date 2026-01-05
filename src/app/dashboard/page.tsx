"use client";

// ============================================
// 대시보드 페이지 - 글씨 크기 1.3배 확대
// ============================================

import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/common";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface StatCard {
  value: number;
  change: number;
  changePercent: number;
}

interface DashboardData {
  appUsage: {
    dau: StatCard;
    mau: StatCard;
    newUsers: StatCard;
    churnUsers: StatCard;
  };
  featureUsage: {
    name: string;
    usageCount: StatCard;
    userCount: StatCard;
  }[];
  contentViews: {
    categoryType: string;
    categoryName: string;
    weeklyViews: number;
    monthlyViews: number;
    totalViews: number;
  }[];
  inquiries: {
    id: string;
    inquiryType: string;
    content: string;
    status: string;
  }[];
  points: {
    total: { value: number; period: string };
    monthly: { value: number; changePercent: number };
    weekly: { value: number; changePercent: number };
    daily: { value: number; changePercent: number };
    conversions: {
      type: string;
      daily: number;
      weekly: number;
      monthly: number;
      total: number;
    }[];
  };
  challenges: {
    columns: string[];
    data: { target: string; [key: string]: string | number }[];
  };
}

// 숫자 포맷팅
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString("ko-KR");
}

// 섹션 타이틀 컴포넌트
function SectionTitle({
  children,
  subText,
}: {
  children: React.ReactNode;
  subText?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-[7px] h-[28px] bg-[#535353]" />
      <h3 className="text-[22px] font-bold text-black">{children}</h3>
      {subText && (
        <span className="text-[14px] text-[#535353] ml-1">{subText}</span>
      )}
    </div>
  );
}

// 앱 이용 현황 카드 컴포넌트
function AppUsageCard({
  title,
  value,
  change,
  changePercent,
  compareText,
}: {
  title: string;
  value: number;
  change: number;
  changePercent: number;
  compareText: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-[10px] shadow-sm flex-1">
      <div className="px-3 py-2 border-b border-gray-200">
        <h4 className="text-[16px] font-bold text-black text-center">
          {title}
        </h4>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-[20px] text-black font-medium">
          {formatNumber(value)}명
        </p>
        <p className="text-[13px] text-[#535353] mt-1">
          {compareText} {isPositive ? "+" : ""}
          {formatNumber(change)}명 ({isPositive ? "+" : ""}
          {changePercent}%)
        </p>
      </div>
    </div>
  );
}

// 포인트 카드 컴포넌트
function PointCard({
  title,
  value,
  subText,
}: {
  title: string;
  value: string;
  subText?: string;
}) {
  return (
    <div className="bg-white rounded-t-[10px] shadow-sm flex-1">
      <div className="px-3 py-2 border-b border-gray-200">
        <h4 className="text-[15px] font-bold text-black text-center">
          {title}
        </h4>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-[18px] text-black font-medium">{value}</p>
        {subText && (
          <p className="text-[12px] text-[#535353] mt-1">{subText}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchData = async () => {
    // 토큰 없으면 API 호출 안 함
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get("/admin/dashboard");
      if (res.success && res.data) {
        setData(res.data as DashboardData);
      }
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // StrictMode에서 중복 호출 방지
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // 데이터가 없을 때 기본값
  const defaultData: DashboardData = {
    appUsage: {
      dau: { value: 0, change: 0, changePercent: 0 },
      mau: { value: 0, change: 0, changePercent: 0 },
      newUsers: { value: 0, change: 0, changePercent: 0 },
      churnUsers: { value: 0, change: 0, changePercent: 0 },
    },
    featureUsage: [],
    contentViews: [],
    inquiries: [],
    points: {
      total: { value: 0, period: "" },
      monthly: { value: 0, changePercent: 0 },
      weekly: { value: 0, changePercent: 0 },
      daily: { value: 0, changePercent: 0 },
      conversions: [],
    },
    challenges: {
      columns: [],
      data: [],
    },
  };

  const dashboardData = data || defaultData;

  // 기본 컨텐츠 데이터
  const defaultContentViews = [
    "면역력",
    "눈건강",
    "뼈관절건강",
    "근력",
    "체중조절",
    "두뇌활동",
    "피로회복",
  ].map((name) => ({
    categoryType: "관심사",
    categoryName: name,
    weeklyViews: 0,
    monthlyViews: 0,
    totalViews: 0,
  }));

  const contentViewsData =
    dashboardData.contentViews.length > 0
      ? dashboardData.contentViews
      : defaultContentViews;

  // 기본 기능 사용 데이터
  const defaultFeatureUsage = [
    "식사기록",
    "영양제 기록",
    "챗봇 상담",
    "컨텐츠 조회",
  ].map((name) => ({
    name,
    usageCount: { value: 0, change: 0, changePercent: 0 },
    userCount: { value: 0, change: 0, changePercent: 0 },
  }));

  const featureUsageData =
    dashboardData.featureUsage.length > 0
      ? dashboardData.featureUsage
      : defaultFeatureUsage;

  // 기본 문의 데이터
  const defaultInquiries = [
    {
      id: "1",
      inquiryType: "연동문제",
      content: "그리팅몰 연동했는데 쿠폰이 안들어와요",
      status: "pending",
    },
    {
      id: "2",
      inquiryType: "포인트",
      content: "그리팅 케어 포인트는 어디에 쓸 수 있어요?",
      status: "answered",
    },
    { id: "3", inquiryType: "기타", content: "", status: "pending" },
    { id: "4", inquiryType: "기타", content: "", status: "pending" },
    { id: "5", inquiryType: "기타", content: "", status: "pending" },
    { id: "6", inquiryType: "기타", content: "", status: "pending" },
  ];

  const inquiriesData =
    dashboardData.inquiries.length > 0
      ? dashboardData.inquiries
      : defaultInquiries;

  // 기본 전환 데이터
  const defaultConversions = ["H.point", "스푼", "GR쿠폰", "그리너리"].map(
    (type) => ({
      type,
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
    })
  );

  const conversionsData =
    dashboardData.points.conversions.length > 0
      ? dashboardData.points.conversions
      : defaultConversions;

  // 기본 챌린지 데이터
  const defaultChallenges = ["전체", "FS", "제휴", "스토어"].map((target) => ({
    target,
    attendance: 0,
    steps: 0,
    meal: 0,
    supplement: 0,
    nutrition_diagnosis: 0,
    health_habit: 0,
    quiz: 0,
  }));

  const challengesData =
    dashboardData.challenges?.data && dashboardData.challenges.data.length > 0
      ? dashboardData.challenges.data
      : defaultChallenges;

  return (
    <AdminLayout>
      <div className="bg-[#f0f0f0] min-h-[calc(100vh-60px)]">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between px-5 py-3">
          <h1 className="text-2xl font-bold text-black">대시보드</h1>
          <div className="flex gap-2">
            <Button onClick={fetchData} className="px-4 py-2 text-sm">
              조회
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              className="px-3 py-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="bg-white rounded-[5px] mx-5 p-5 mb-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#535353]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {/* 좌측 영역 */}
              <div className="flex flex-col gap-4">
                {/* 앱 이용 현황 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle>앱 이용 현황</SectionTitle>
                  <div className="flex gap-3">
                    <AppUsageCard
                      title="일일 사용자 수"
                      value={dashboardData.appUsage.dau.value}
                      change={dashboardData.appUsage.dau.change}
                      changePercent={dashboardData.appUsage.dau.changePercent}
                      compareText="전일 대비"
                    />
                    <AppUsageCard
                      title="월간 사용자 수"
                      value={dashboardData.appUsage.mau.value}
                      change={dashboardData.appUsage.mau.change}
                      changePercent={dashboardData.appUsage.mau.changePercent}
                      compareText="전월 대비"
                    />
                    <AppUsageCard
                      title="신규 가입자 수"
                      value={dashboardData.appUsage.newUsers.value}
                      change={dashboardData.appUsage.newUsers.change}
                      changePercent={
                        dashboardData.appUsage.newUsers.changePercent
                      }
                      compareText="전주 대비"
                    />
                    <AppUsageCard
                      title="이탈 사용자 수"
                      value={dashboardData.appUsage.churnUsers.value}
                      change={dashboardData.appUsage.churnUsers.change}
                      changePercent={
                        dashboardData.appUsage.churnUsers.changePercent
                      }
                      compareText="전월 대비"
                    />
                  </div>
                </div>

                {/* 주요 기능 사용 현황 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle subText="*최근 7일 기준">
                    주요 기능 사용 현황
                  </SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2.5 text-center font-semibold text-black">
                            기능명
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            사용 횟수
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            사용자 수
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            전주 대비 사용 횟수
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            전주 대비 사용자 수
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {featureUsageData.map((feature, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#a5a5a5] last:border-b-0"
                          >
                            <td className="px-3 py-2.5 text-black">
                              {feature.name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {formatNumber(feature.usageCount.value)}회
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {formatNumber(feature.userCount.value)}명
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {feature.usageCount.change >= 0 ? "+" : ""}
                              {formatNumber(feature.usageCount.change)}회 (
                              {feature.usageCount.changePercent}%)
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {feature.userCount.change >= 0 ? "+" : ""}
                              {formatNumber(feature.userCount.change)}명 (
                              {feature.userCount.changePercent}%)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 컨텐츠 조회 현황 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle>컨텐츠 조회 현황</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-[14px]">
                      <thead className="sticky top-0">
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2.5 text-center font-semibold text-black">
                            구분
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            카테고리명
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            주간 조회수
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            월간 조회수
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            누적 조회수
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentViewsData.map((content, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#a5a5a5] last:border-b-0"
                          >
                            <td className="px-3 py-2.5 text-center text-black">
                              {content.categoryType}
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {content.categoryName}
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {formatNumber(content.weeklyViews)}회
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {formatNumber(content.monthlyViews)}회
                            </td>
                            <td className="px-3 py-2.5 text-center text-black border-l border-[#e5e5e5]">
                              {formatNumber(content.totalViews)}회
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 우측 영역 */}
              <div className="flex flex-col gap-4">
                {/* 문의 게시판 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle>문의 게시판</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2.5 text-center font-semibold text-black w-[130px]">
                            문의 유형
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            문의 내용
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold text-black border-l border-[#a5a5a5] w-[150px]">
                            처리 상태
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {inquiriesData.slice(0, 6).map((inquiry, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#a5a5a5] last:border-b-0"
                          >
                            <td className="px-3 py-2.5 text-black">
                              {inquiry.inquiryType}
                            </td>
                            <td className="px-3 py-2.5 text-black border-l border-[#e5e5e5]">
                              {inquiry.content || "-"}
                            </td>
                            <td className="px-3 py-2.5 border-l border-[#e5e5e5]">
                              {inquiry.content && (
                                <div className="flex items-center justify-center gap-2">
                                  <span
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[13px] font-bold text-white",
                                      inquiry.status === "pending"
                                        ? "bg-[#535353]"
                                        : "bg-[#9c80d4]"
                                    )}
                                  >
                                    {inquiry.status === "pending"
                                      ? "미답변"
                                      : "답변 완료"}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 포인트 현황 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle>포인트 현황</SectionTitle>

                  {/* 포인트 요약 카드 */}
                  <div className="flex gap-2 mb-2">
                    <PointCard
                      title="누적 발급 포인트"
                      value={`${formatNumber(
                        dashboardData.points.total.value
                      )}P`}
                      subText={dashboardData.points.total.period || ""}
                    />
                    <PointCard
                      title="월간 발급 포인트"
                      value={`${formatNumber(
                        dashboardData.points.monthly.value
                      )}P`}
                      subText={`전월 대비 ${
                        dashboardData.points.monthly.changePercent >= 0
                          ? "+"
                          : ""
                      }${dashboardData.points.monthly.changePercent}%`}
                    />
                    <PointCard
                      title="주간 발급 포인트"
                      value={`${formatNumber(
                        dashboardData.points.weekly.value
                      )}P`}
                      subText={`전주 대비 ${
                        dashboardData.points.weekly.changePercent >= 0
                          ? "+"
                          : ""
                      }${dashboardData.points.weekly.changePercent}%`}
                    />
                    <PointCard
                      title="일간 발급 포인트"
                      value={`${formatNumber(
                        dashboardData.points.daily.value
                      )}P`}
                      subText={`전일 대비 ${
                        dashboardData.points.daily.changePercent >= 0 ? "+" : ""
                      }${dashboardData.points.daily.changePercent}%`}
                    />
                  </div>

                  {/* 전환 유형별 테이블 */}
                  <div className="grid grid-cols-4 gap-2">
                    {["누적", "월간", "주간", "일간"].map(
                      (period, periodIdx) => (
                        <div
                          key={period}
                          className="bg-white rounded-b-[5px] overflow-hidden"
                        >
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="bg-[#d9d9d9]">
                                <th className="px-2 py-1.5 text-center font-semibold text-black">
                                  전환 구분
                                </th>
                                <th className="px-2 py-1.5 text-center font-semibold text-black border-l border-[#a5a5a5]">
                                  전환 금액
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {conversionsData.map((conv, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-[#a5a5a5] last:border-b-0"
                                >
                                  <td className="px-2 py-1 text-center text-black">
                                    {conv.type}
                                  </td>
                                  <td className="px-2 py-1 text-center text-black border-l border-[#e5e5e5]">
                                    {formatNumber(
                                      periodIdx === 0
                                        ? conv.total
                                        : periodIdx === 1
                                        ? conv.monthly
                                        : periodIdx === 2
                                        ? conv.weekly
                                        : conv.daily
                                    )}
                                    P
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 챌린지 진행 현황 */}
                <div className="bg-[#eee] rounded-[18px] p-4 shadow-sm">
                  <SectionTitle>챌린지 진행 현황</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-2 py-2 text-center font-semibold text-black">
                            참여 대상
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            출석체크
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            걸음수
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            식사기록
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            영양제기록
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            영양설문
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            건강습관
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-[#a5a5a5]">
                            퀴즈
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {challengesData.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-[#a5a5a5] last:border-b-0"
                          >
                            <td className="px-2 py-2 text-center text-black">
                              {row.target}
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                            <td className="px-2 py-2 text-center text-black border-l border-[#e5e5e5]">
                              N개
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
