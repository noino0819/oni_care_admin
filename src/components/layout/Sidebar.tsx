'use client';

// ============================================
// 사이드바 컴포넌트
// ============================================

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuItems } from '@/lib/menu';
import { useRecentMenus } from '@/hooks/useRecentMenus';
import {
  Home,
  BarChart3,
  ClipboardList,
  User,
  Settings,
  ChevronRight,
} from 'lucide-react';
import type { MenuItem } from '@/types';

// 아이콘 매핑
const iconMap: Record<string, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  chart: <BarChart3 className="w-5 h-5" />,
  clipboard: <ClipboardList className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
};

interface SidebarProps {
  isSubmenuOpen: boolean;
  onSubmenuToggle: (isOpen: boolean) => void;
  activeMenuId: string | null;
  onMenuSelect: (menuId: string | null) => void;
}

export function Sidebar({
  isSubmenuOpen,
  onSubmenuToggle,
  activeMenuId,
  onMenuSelect,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { addRecentMenu } = useRecentMenus();

  const handleMenuClick = (menu: MenuItem) => {
    if (menu.children) {
      // 서브메뉴가 있는 경우 토글
      if (activeMenuId === menu.id) {
        onMenuSelect(null);
        onSubmenuToggle(false);
      } else {
        onMenuSelect(menu.id);
        onSubmenuToggle(true);
      }
    } else if (menu.path) {
      // 직접 이동
      router.push(menu.path);
      onSubmenuToggle(false);
      addRecentMenu({
        id: menu.id,
        label: menu.label,
        path: menu.path,
      });
    }
  };

  const handleSubmenuClick = (submenu: { id: string; label: string; path: string }, parentLabel: string) => {
    router.push(submenu.path);
    addRecentMenu({
      id: submenu.id,
      label: submenu.label,
      path: submenu.path,
    });
  };

  const isMenuActive = (menu: MenuItem): boolean => {
    if (menu.path) {
      return pathname === menu.path;
    }
    if (menu.children) {
      return menu.children.some((sub) => pathname === sub.path);
    }
    return false;
  };

  const activeMenu = menuItems.find((m) => m.id === activeMenuId);

  return (
    <>
      {/* 메인 사이드바 */}
      <aside className="w-20 bg-white border-r border-gray-200 fixed left-0 top-14 bottom-0 z-40">
        <nav className="py-2">
          {menuItems.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleMenuClick(menu)}
              className={cn(
                'w-full py-4 flex flex-col items-center gap-1 text-gray-600 hover:bg-gray-50 transition-colors',
                (isMenuActive(menu) || activeMenuId === menu.id) && 'bg-gray-100 text-gray-900'
              )}
            >
              {iconMap[menu.icon]}
              <span className="text-xs">{menu.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 서브메뉴 패널 */}
      {isSubmenuOpen && activeMenu?.children && (
        <aside className="w-48 bg-white border-r border-gray-200 fixed left-20 top-14 bottom-0 z-30 shadow-lg">
          <nav className="py-2">
            {activeMenu.children.map((submenu) => (
              <button
                key={submenu.id}
                onClick={() => handleSubmenuClick(submenu, activeMenu.label)}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between',
                  pathname === submenu.path && 'bg-gray-100 text-gray-900 font-medium'
                )}
              >
                {submenu.label}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </nav>
        </aside>
      )}
    </>
  );
}

