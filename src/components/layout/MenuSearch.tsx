'use client';

// ============================================
// 메뉴 검색 컴포넌트
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchMenus, getAllSubMenus } from '@/lib/menu';
import { useRecentMenus } from '@/hooks/useRecentMenus';

export function MenuSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchMenus>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recentMenus, addRecentMenu, removeRecentMenu } = useRecentMenus();

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 검색 처리
  useEffect(() => {
    const results = searchMenus(query);
    setSearchResults(results);
  }, [query]);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleMenuClick = (menu: { menuId: string; menuLabel: string; path: string }) => {
    router.push(menu.path);
    addRecentMenu({
      id: menu.menuId,
      label: menu.menuLabel,
      path: menu.path,
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleRecentMenuRemove = (e: React.MouseEvent, menuId: string) => {
    e.stopPropagation();
    removeRecentMenu(menuId);
  };

  const allMenus = getAllSubMenus();

  return (
    <div className="relative" ref={containerRef}>
      {/* 검색 입력 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search menu..."
          className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8E600] focus:border-transparent"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
          {/* 최근 사용 */}
          {recentMenus.length > 0 && (
            <div className="p-3 border-b">
              <div className="text-xs text-gray-500 mb-2">최근 사용</div>
              <div className="flex flex-wrap gap-2">
                {recentMenus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => handleMenuClick({ menuId: menu.id, menuLabel: menu.label, path: menu.path })}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {menu.label}
                    <X
                      className="w-3 h-3 text-gray-400 hover:text-gray-600"
                      onClick={(e) => handleRecentMenuRemove(e, menu.id)}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 검색 결과 또는 전체 메뉴 */}
          <div className="py-2">
            {query ? (
              searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.menuId}
                    onClick={() => handleMenuClick(result)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {result.menuLabel}
                    </div>
                    {result.parentLabel && (
                      <div className="text-xs text-gray-500">
                        {result.parentLabel}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  검색 결과가 없습니다.
                </div>
              )
            ) : (
              // 전체 메뉴 표시
              <div className="grid grid-cols-2 gap-2 px-3">
                <div>
                  {allMenus.slice(0, Math.ceil(allMenus.length / 2)).map((menu) => (
                    <button
                      key={menu.menuId}
                      onClick={() => handleMenuClick(menu)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      {menu.menuLabel}
                    </button>
                  ))}
                </div>
                <div>
                  {allMenus.slice(Math.ceil(allMenus.length / 2)).map((menu) => (
                    <button
                      key={menu.menuId}
                      onClick={() => handleMenuClick(menu)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      {menu.menuLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

