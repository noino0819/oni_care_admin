'use client';

// ============================================
// 사이드바 컴포넌트 - 크기 조정
// ============================================

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuItems } from '@/lib/menu';
import { useRecentMenus } from '@/hooks/useRecentMenus';
import {
  Home,
  Monitor,
  Settings,
} from 'lucide-react';
import type { MenuItem } from '@/types';

// 아이콘 매핑
const iconMap: Record<string, React.ReactNode> = {
  home: <Home className="w-6 h-6 stroke-[1.5]" />,
  chart: <Monitor className="w-6 h-6 stroke-[1.5]" />,
  clipboard: <Monitor className="w-6 h-6 stroke-[1.5]" />,
  user: <Monitor className="w-6 h-6 stroke-[1.5]" />,
  settings: <Settings className="w-6 h-6 stroke-[1.5]" />,
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
      if (activeMenuId === menu.id) {
        onMenuSelect(null);
        onSubmenuToggle(false);
      } else {
        onMenuSelect(menu.id);
        onSubmenuToggle(true);
      }
    } else if (menu.path) {
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
      <aside className="w-[80px] bg-[#f5f5f5] fixed left-0 top-[60px] bottom-0 z-40 border-r border-gray-200">
        <nav className="flex flex-col">
          {menuItems.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleMenuClick(menu)}
              className={cn(
                'w-full py-4 flex flex-col items-center justify-center gap-1 text-[#666] transition-colors',
                (isMenuActive(menu) || activeMenuId === menu.id) 
                  ? 'bg-white text-black' 
                  : 'hover:bg-[#eee]'
              )}
            >
              <div className="flex items-center justify-center">
                {iconMap[menu.icon]}
              </div>
              <span className="text-[11px] font-medium text-center whitespace-nowrap">
                {menu.label}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 서브메뉴 패널 */}
      {isSubmenuOpen && activeMenu?.children && (
        <aside className="w-[160px] bg-white border-r border-gray-200 fixed left-[80px] top-[60px] bottom-0 z-30 shadow-lg">
          <nav className="py-2">
            {activeMenu.children.map((submenu) => (
              <button
                key={submenu.id}
                onClick={() => handleSubmenuClick(submenu, activeMenu.label)}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-[13px] text-[#333] hover:bg-gray-50 transition-colors',
                  pathname === submenu.path && 'bg-gray-100 font-medium'
                )}
              >
                {submenu.label}
              </button>
            ))}
          </nav>
        </aside>
      )}
    </>
  );
}
