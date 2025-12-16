'use client';

// ============================================
// 헤더 컴포넌트
// ============================================

import { useRouter } from 'next/navigation';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/common';
import { useSession } from '@/hooks/useSession';

export function Header() {
  const router = useRouter();
  const { user, timer, logout } = useSession();

  const handleLogoClick = () => {
    router.push('/dashboard');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      {/* 로고 */}
      <button
        onClick={handleLogoClick}
        className="text-xl font-bold text-[#C8E600] hover:opacity-80 transition-opacity"
      >
        GreatingCare
      </button>

      {/* 우측 영역 */}
      <div className="flex items-center gap-4">
        {/* 로그인 정보 */}
        {user && (
          <div className="text-sm text-gray-700">
            <span className="text-gray-500">[{user.organization || '본사'}]</span>
            {' '}
            <span className="font-medium">{user.name}</span>
            {' 님'}
          </div>
        )}

        {/* 세션 타이머 */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="font-mono">{timer.formattedTime}</span>
        </div>

        {/* 로그아웃 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-4"
        >
          <LogOut className="w-4 h-4 mr-1" />
          로그아웃
        </Button>
      </div>
    </header>
  );
}

