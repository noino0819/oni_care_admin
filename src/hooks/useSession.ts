'use client';

// ============================================
// 세션 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime } from '@/lib/utils';
import type { AdminUser, SessionTimer } from '@/types';

const SESSION_DURATION = 60 * 60; // 1시간 (초)
const SESSION_KEY = 'admin_session';
const SESSION_EXPIRY_KEY = 'admin_session_expiry';

interface UseSessionReturn {
  user: AdminUser | null;
  timer: SessionTimer;
  isAuthenticated: boolean;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
  extendSession: () => void;
}

export function useSession(): UseSessionReturn {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_DURATION);
  const [isInitialized, setIsInitialized] = useState(false);

  // 세션 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionData = localStorage.getItem(SESSION_KEY);
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);

    if (sessionData && expiryTime) {
      const expiry = parseInt(expiryTime, 10);
      const remaining = Math.floor((expiry - Date.now()) / 1000);

      if (remaining > 0) {
        try {
          const userData = JSON.parse(sessionData);
          setUser(userData);
          setRemainingSeconds(remaining);
        } catch {
          // 파싱 실패 시 세션 클리어
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
        }
      } else {
        // 만료된 세션
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      }
    }

    setIsInitialized(true);
  }, []);

  // 타이머 카운트다운
  useEffect(() => {
    if (!isInitialized || !user) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // 세션 만료
          clearInterval(interval);
          handleLogout();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, user]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem('admin_token');
    setUser(null);
    setRemainingSeconds(0);
    router.push('/login');
  }, [router]);

  const login = useCallback((userData: AdminUser, token: string) => {
    const expiryTime = Date.now() + SESSION_DURATION * 1000;
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiryTime));
    localStorage.setItem('admin_token', token);
    
    setUser(userData);
    setRemainingSeconds(SESSION_DURATION);
  }, []);

  const extendSession = useCallback(() => {
    if (!user) return;
    
    const expiryTime = Date.now() + SESSION_DURATION * 1000;
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiryTime));
    setRemainingSeconds(SESSION_DURATION);
  }, [user]);

  const timer: SessionTimer = {
    remainingSeconds,
    isExpired: remainingSeconds <= 0,
    formattedTime: formatTime(remainingSeconds),
  };

  return {
    user,
    timer,
    isAuthenticated: !!user,
    login,
    logout: handleLogout,
    extendSession,
  };
}

