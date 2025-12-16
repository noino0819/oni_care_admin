'use client';

// ============================================
// 최근 사용 메뉴 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { RecentMenu } from '@/types';

const RECENT_MENUS_KEY = 'admin_recent_menus';
const MAX_RECENT_MENUS = 3;

interface UseRecentMenusReturn {
  recentMenus: RecentMenu[];
  addRecentMenu: (menu: Omit<RecentMenu, 'visitedAt'>) => void;
  removeRecentMenu: (menuId: string) => void;
  clearRecentMenus: () => void;
}

export function useRecentMenus(): UseRecentMenusReturn {
  const [recentMenus, setRecentMenus] = useState<RecentMenu[]>([]);

  // 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(RECENT_MENUS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((menu: RecentMenu) => ({
          ...menu,
          visitedAt: new Date(menu.visitedAt),
        }));
        setRecentMenus(parsed);
      } catch {
        localStorage.removeItem(RECENT_MENUS_KEY);
      }
    }
  }, []);

  // 저장
  const saveToStorage = useCallback((menus: RecentMenu[]) => {
    localStorage.setItem(RECENT_MENUS_KEY, JSON.stringify(menus));
  }, []);

  // 메뉴 추가
  const addRecentMenu = useCallback((menu: Omit<RecentMenu, 'visitedAt'>) => {
    setRecentMenus((prev) => {
      // 이미 있으면 제거 후 맨 앞에 추가
      const filtered = prev.filter((m) => m.id !== menu.id);
      const newMenu: RecentMenu = {
        ...menu,
        visitedAt: new Date(),
      };
      const updated = [newMenu, ...filtered].slice(0, MAX_RECENT_MENUS);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // 메뉴 제거
  const removeRecentMenu = useCallback((menuId: string) => {
    setRecentMenus((prev) => {
      const updated = prev.filter((m) => m.id !== menuId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // 전체 삭제
  const clearRecentMenus = useCallback(() => {
    localStorage.removeItem(RECENT_MENUS_KEY);
    setRecentMenus([]);
  }, []);

  return {
    recentMenus,
    addRecentMenu,
    removeRecentMenu,
    clearRecentMenus,
  };
}

