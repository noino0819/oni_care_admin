'use client';

// ============================================
// 헤더 컴포넌트 - 크기 조정
// ============================================

import { useRouter } from 'next/navigation';
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
    <header className="h-[60px] bg-white fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 border-b border-gray-100">
      {/* 로고 */}
      <button
        onClick={handleLogoClick}
        className="font-logo text-[28px] text-[#737373] hover:opacity-80 transition-opacity"
      >
        GreatingCare
      </button>

      {/* 우측 영역 */}
      <div className="flex items-center gap-3">
        {/* 소속 */}
        {user && (
          <span className="text-[14px] text-[#737373] font-medium">
            [{user.organization || '현대그린푸드 본사'}]
          </span>
        )}

        {/* 사용자명 */}
        {user && (
          <span className="text-[14px] text-black font-medium">
            {user.name || '관리자'} 님
          </span>
        )}

        {/* 세로 구분선 */}
        <div className="w-[1px] h-[20px] bg-[#d9d9d9]" />

        {/* 세션 타이머 */}
        <span className="text-[14px] text-[#737373] font-medium">
          ⏳{timer.formattedTime}
        </span>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          className="h-[32px] px-4 bg-[#737373] text-white text-[14px] font-medium rounded-[5px] hover:bg-[#666666] transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
