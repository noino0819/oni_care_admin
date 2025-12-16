'use client';

// ============================================
// 홈 페이지 (리다이렉트)
// ============================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 로그인 페이지로 리다이렉트
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
    </div>
  );
}
