"use client";

// ============================================
// 어드민 레이아웃 컴포넌트 - 크기 조정
// ============================================

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

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
    if (typeof window === "undefined") return;

    const checkAuth = () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#737373]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
          "pt-[60px] bg-[#f5f5f5] min-h-screen transition-all duration-300"
        )}
        style={{
          marginLeft: isSubmenuOpen ? "240px" : "80px",
        }}
      >
        {/* 페이지 콘텐츠 */}
        <div className="">{children}</div>
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
