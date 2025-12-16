'use client';

// ============================================
// 대시보드 페이지
// ============================================

import { AdminLayout } from '@/components/layout';
import { useSession } from '@/hooks/useSession';
import {
  Users,
  Trophy,
  FileText,
  Pill,
  TrendingUp,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useSession();

  const stats = [
    { label: '전체 회원', value: '12,345', icon: Users, color: 'bg-blue-500' },
    { label: '진행중 챌린지', value: '8', icon: Trophy, color: 'bg-green-500' },
    { label: '컨텐츠', value: '156', icon: FileText, color: 'bg-purple-500' },
    { label: '영양제 상품', value: '89', icon: Pill, color: 'bg-orange-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-1">
            안녕하세요, {user?.name}님! GreatingCare 어드민에 오신 것을 환영합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow p-6 flex items-center gap-4"
            >
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 최근 활동 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 가입 회원 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">최근 가입 회원</h2>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">김*민</p>
                        <p className="text-xs text-gray-500">kim***@email.com</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">1시간 전</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 시스템 상태 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">시스템 상태</h2>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API 서버</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">데이터베이스</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Redis</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">FCM</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    정상
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">마지막 배치</span>
                  <span className="text-sm text-gray-900">2025.01.16 09:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

