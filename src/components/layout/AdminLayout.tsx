'use client';

// ============================================
// 어드민 레이아웃 컴포넌트
// ============================================

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MenuSearch } from './MenuSearch';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useSession();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 인증 확인
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    const checkAuth = () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    };

    // 약간의 지연 후 체크 (hydration 문제 방지)
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <Header />

      {/* 사이드바 */}
      <Sidebar
        isSubmenuOpen={isSubmenuOpen}
        onSubmenuToggle={setIsSubmenuOpen}
        activeMenuId={activeMenuId}
        onMenuSelect={setActiveMenuId}
      />

      {/* 메인 콘텐츠 영역 */}
      <main
        className={cn(
          'pt-14 transition-all duration-300',
          isSubmenuOpen ? 'ml-68' : 'ml-20'
        )}
        style={{ marginLeft: isSubmenuOpen ? 'calc(5rem + 12rem)' : '5rem' }}
      >
        {/* 검색바 영역 */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <MenuSearch />
        </div>

        {/* 페이지 콘텐츠 */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* 서브메뉴 오버레이 */}
      {isSubmenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setIsSubmenuOpen(false);
            setActiveMenuId(null);
          }}
        />
      )}
    </div>
  );
}

