'use client';

// ============================================
// 대시보드 페이지 - Figma 디자인 적용
// ============================================

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/common';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    conversions: { type: string; daily: number; weekly: number; monthly: number; total: number }[];
  };
  challenges: {
    columns: string[];
    data: { target: string; [key: string]: string | number }[];
  };
}

// 숫자 포맷팅
function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

// 섹션 타이틀 컴포넌트
function SectionTitle({ children, subText }: { children: React.ReactNode; subText?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-[6px] h-6 bg-[#535353]" />
      <h3 className="text-xl font-bold text-black">{children}</h3>
      {subText && <span className="text-xs text-[#535353] ml-1">{subText}</span>}
    </div>
  );
}

// 앱 이용 현황 카드 컴포넌트
function AppUsageCard({ title, value, change, changePercent, compareText }: { 
  title: string; 
  value: number; 
  change: number; 
  changePercent: number;
  compareText: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-[10px] shadow-sm flex-1 min-w-[140px]">
      <div className="px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-bold text-black text-center">{title}</h4>
      </div>
      <div className="px-4 py-3 text-center">
        <p className="text-lg text-black font-medium">{formatNumber(value)}명</p>
        <p className="text-xs text-[#535353] mt-1">
          {compareText} {isPositive ? '+' : ''}{formatNumber(change)}명 ({isPositive ? '+' : ''}{changePercent}%)
        </p>
      </div>
    </div>
  );
}

// 포인트 카드 컴포넌트
function PointCard({ title, value, subText }: { title: string; value: string; subText?: string }) {
  return (
    <div className="bg-white rounded-t-[10px] shadow-sm flex-1">
      <div className="px-3 py-2 border-b border-gray-200">
        <h4 className="text-sm font-bold text-black text-center">{title}</h4>
      </div>
      <div className="px-3 py-3 text-center">
        <p className="text-lg text-black font-medium">{value}</p>
        {subText && <p className="text-xs text-[#535353] mt-1">{subText}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      total: { value: 0, period: '' },
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

  return (
    <AdminLayout>
      <div className="bg-[#f0f0f0] min-h-screen">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between mb-4 px-6 pt-4">
          <h1 className="text-2xl font-bold text-black">대시보드</h1>
          <div className="flex gap-2">
            <Button onClick={fetchData} className="px-4 py-2 text-sm">조회</Button>
            <Button variant="secondary" onClick={handleRefresh} className="px-3 py-2 text-sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="bg-white rounded-[5px] mx-6 p-5 min-h-[900px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#535353]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {/* 좌측 영역 */}
              <div className="space-y-5">
                {/* 앱 이용 현황 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
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
                      changePercent={dashboardData.appUsage.newUsers.changePercent}
                      compareText="전주 대비"
                    />
                    <AppUsageCard
                      title="이탈 사용자 수"
                      value={dashboardData.appUsage.churnUsers.value}
                      change={dashboardData.appUsage.churnUsers.change}
                      changePercent={dashboardData.appUsage.churnUsers.changePercent}
                      compareText="전월 대비"
                    />
                  </div>
                </div>

                {/* 주요 기능 사용 현황 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
                  <SectionTitle subText="*최근 7일 기준">주요 기능 사용 현황</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2 text-center font-semibold text-black">기능명</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">사용 횟수</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">사용자 수</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">전주 대비 사용 횟수</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">전주 대비 사용자 수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.featureUsage.length === 0 ? (
                          ['식사기록', '영양제 기록', '챗봇 상담', '컨텐츠 조회'].map((name, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-center text-black">{name}</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">N회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">N명</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">±N회 (N%)</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">±N명 (N%)</td>
                            </tr>
                          ))
                        ) : (
                          dashboardData.featureUsage.map((feature, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-center text-black">{feature.name}</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{formatNumber(feature.usageCount.value)}회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{formatNumber(feature.userCount.value)}명</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">
                                {feature.usageCount.change >= 0 ? '+' : ''}{formatNumber(feature.usageCount.change)}회 ({feature.usageCount.changePercent}%)
                              </td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">
                                {feature.userCount.change >= 0 ? '+' : ''}{formatNumber(feature.userCount.change)}명 ({feature.userCount.changePercent}%)
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 컨텐츠 조회 현황 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
                  <SectionTitle>컨텐츠 조회 현황</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2 text-center font-semibold text-black">구분</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">카테고리명</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">주간 조회수</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">월간 조회수</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">누적 조회수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.contentViews.length === 0 ? (
                          ['면역력', '눈건강', '뼈관절건강', '근력', '체중조절', '두뇌활동', '피로회복'].map((name, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-center text-black">관심사</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{name}</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">N회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">N회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">N회</td>
                            </tr>
                          ))
                        ) : (
                          dashboardData.contentViews.map((content, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-center text-black">{content.categoryType}</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{content.categoryName}</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{formatNumber(content.weeklyViews)}회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{formatNumber(content.monthlyViews)}회</td>
                              <td className="px-3 py-2 text-center text-black border-l border-gray-200">{formatNumber(content.totalViews)}회</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 우측 영역 */}
              <div className="space-y-5">
                {/* 문의 게시판 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
                  <SectionTitle>문의 게시판</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-3 py-2 text-center font-semibold text-black w-[100px]">문의 유형</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400">문의 내용</th>
                          <th className="px-3 py-2 text-center font-semibold text-black border-l border-gray-400 w-[140px]">처리 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.inquiries.length === 0 ? (
                          [
                            { type: '연동문제', content: '그리팅몰 연동했는데 쿠폰이 안들어와요', status: 'pending' },
                            { type: '포인트', content: '그리팅 케어 포인트는 어디에 쓸 수 있어요?', status: 'answered' }
                          ].map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-black">{item.type}</td>
                              <td className="px-3 py-2 text-black border-l border-gray-200">{item.content}</td>
                              <td className="px-3 py-2 border-l border-gray-200">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={cn(
                                    'px-3 py-0.5 rounded-full text-xs font-bold text-white',
                                    item.status === 'pending' ? 'bg-[#535353]' : 'bg-[#9c80d4]'
                                  )}>
                                    {item.status === 'pending' ? '미답변' : '답변 완료'}
                                  </span>
                                  <span className="bg-[#bbd900] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    4-{idx + 1}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          dashboardData.inquiries.map((inquiry, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-3 py-2 text-black">{inquiry.inquiryType}</td>
                              <td className="px-3 py-2 text-black border-l border-gray-200">{inquiry.content}</td>
                              <td className="px-3 py-2 border-l border-gray-200">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={cn(
                                    'px-3 py-0.5 rounded-full text-xs font-bold text-white',
                                    inquiry.status === 'pending' ? 'bg-[#535353]' : 'bg-[#9c80d4]'
                                  )}>
                                    {inquiry.status === 'pending' ? '미답변' : '답변 완료'}
                                  </span>
                                  <span className="bg-[#bbd900] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    4-{inquiry.status === 'pending' ? '1' : '2'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 포인트 현황 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
                  <SectionTitle>포인트 현황</SectionTitle>
                  
                  {/* 포인트 요약 카드 */}
                  <div className="flex gap-2 mb-2">
                    <PointCard
                      title="누적 발급 포인트"
                      value={`${formatNumber(dashboardData.points.total.value)}P`}
                      subText={dashboardData.points.total.period || ''}
                    />
                    <PointCard
                      title="월간 발급 포인트"
                      value={`${formatNumber(dashboardData.points.monthly.value)}P`}
                      subText={`전월 대비 ${dashboardData.points.monthly.changePercent >= 0 ? '+' : ''}${dashboardData.points.monthly.changePercent}%`}
                    />
                    <PointCard
                      title="주간 발급 포인트"
                      value={`${formatNumber(dashboardData.points.weekly.value)}P`}
                      subText={`전주 대비 ${dashboardData.points.weekly.changePercent >= 0 ? '+' : ''}${dashboardData.points.weekly.changePercent}%`}
                    />
                    <PointCard
                      title="일간 발급 포인트"
                      value={`${formatNumber(dashboardData.points.daily.value)}P`}
                      subText={`전일 대비 ${dashboardData.points.daily.changePercent >= 0 ? '+' : ''}${dashboardData.points.daily.changePercent}%`}
                    />
                  </div>

                  {/* 전환 유형별 테이블 */}
                  <div className="grid grid-cols-4 gap-2">
                    {['누적', '월간', '주간', '일간'].map((period, periodIdx) => {
                      const conversions = dashboardData.points.conversions.length === 0 
                        ? ['H.point', '스푼', 'GR쿠폰', '그리너리'].map(type => ({ type, total: 0, monthly: 0, weekly: 0, daily: 0 }))
                        : dashboardData.points.conversions;
                      
                      return (
                        <div key={period} className="bg-white rounded-b-[5px] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[#d9d9d9]">
                                <th className="px-2 py-1 text-center font-semibold text-black">전환 구분</th>
                                <th className="px-2 py-1 text-center font-semibold text-black border-l border-gray-400">전환 금액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {conversions.map((conv, idx) => (
                                <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                                  <td className="px-2 py-1 text-center text-black">{conv.type}</td>
                                  <td className="px-2 py-1 text-center text-black border-l border-gray-200">
                                    {formatNumber(periodIdx === 0 ? conv.total : periodIdx === 1 ? conv.monthly : periodIdx === 2 ? conv.weekly : conv.daily)}P
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 챌린지 진행 현황 */}
                <div className="bg-[#eee] rounded-[10px] p-4">
                  <SectionTitle>챌린지 진행 현황</SectionTitle>
                  <div className="bg-white rounded-[5px] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="px-2 py-2 text-center font-semibold text-black">참여 대상</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">출석체크</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">걸음수</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">식사기록</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">영양제기록</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">영양설문</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">건강습관</th>
                          <th className="px-2 py-2 text-center font-semibold text-black border-l border-gray-400">퀴즈</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dashboardData.challenges.data.length === 0 
                          ? ['전체', 'FS', '제휴', '스토어'].map(target => ({ target, attendance: 0, steps: 0, meal: 0, supplement: 0, nutrition_diagnosis: 0, health_habit: 0, quiz: 0 }))
                          : dashboardData.challenges.data
                        ).map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="px-2 py-2 text-center text-black">{row.target}</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
                            <td className="px-2 py-2 text-center text-black border-l border-gray-200">N개</td>
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
