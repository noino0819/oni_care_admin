'use client';

// ============================================
// 로그인 페이지
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/common';
import { useSession } from '@/hooks/useSession';
import { getSafeErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 이미 로그인된 경우 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(getSafeErrorMessage(response.status));
        return;
      }

      // 로그인 성공
      login(data.user, data.token);
      router.push('/dashboard');
    } catch {
      setError(getSafeErrorMessage());
    } finally {
      setIsLoading(false);
      // 비밀번호 필드 초기화
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#C8E600]">GreatingCare</h1>
          <p className="text-gray-500 mt-2">어드민 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!email || !password}
            >
              로그인
            </Button>
          </form>
        </div>

        {/* 안내 문구 */}
        <p className="text-center text-sm text-gray-500 mt-4">
          © 2025 GreatingCare. All rights reserved.
        </p>
      </div>
    </div>
  );
}

