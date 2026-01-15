'use client';

// ============================================
// 카페 메뉴 관리 페이지
// ============================================

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, DatePicker } from '@/components/common';
import { useCafeMenus, type CafeMenu, type CafeMenuSearchFilters } from '@/hooks/useCafeMenus';
import { formatDate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import type { TableColumn } from '@/types';

// 사용여부 Badge 컴포넌트
const UsageBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <span className={`text-[13px] font-medium ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
      {isActive ? 'Y' : 'N'}
    </span>
  );
};

export default function CafeMenusPage() {
  const [filters, setFilters] = useState<CafeMenuSearchFilters>({
    business_name: '',
    business_code: '',
    menu_code: '',
    menu_price: null,
    is_active: [],
    created_from: '',
    created_to: '',
  });

  const [page, setPage] = useState(1);

  const { menus, pagination, isLoading, refetch } = useCafeMenus(
    filters,
    page,
    20
  );

  const handleFilterChange = (key: keyof CafeMenuSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      business_name: '',
      business_code: '',
      menu_code: '',
      menu_price: null,
      is_active: [],
      created_from: '',
      created_to: '',
    });
    setPage(1);
    refetch();
  };

  const columns: TableColumn<CafeMenu>[] = [
    {
      key: 'business_code',
      label: '사업장코드',
      width: 100,
      render: (value) => value as string || '-',
    },
    {
      key: 'business_name',
      label: '사업장명',
      width: 180,
      render: (value) => value as string || '-',
    },
    {
      key: 'menu_name',
      label: '메뉴명',
      render: (value) => value as string || '-',
    },
    {
      key: 'menu_code',
      label: '메뉴코드',
      width: 100,
      render: (value) => value as string || '-',
    },
    {
      key: 'menu_price',
      label: '메뉴 단가',
      width: 100,
      render: (value) => {
        const price = value as number;
        return price ? `${price.toLocaleString()}원` : '-';
      },
    },
    {
      key: 'created_at',
      label: '등록일',
      width: 160,
      render: (value) => formatDate(value as string, 'YYYY.MM.DD HH:mm:ss'),
    },
    {
      key: 'updated_at',
      label: '변경일',
      width: 160,
      render: (value) => formatDate(value as string, 'YYYY.MM.DD HH:mm:ss'),
    },
    {
      key: 'is_active',
      label: '사용여부',
      width: 80,
      render: (value) => <UsageBadge isActive={value as boolean} />,
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  // 스켈레톤 로딩 UI
  const renderSkeletonRows = () => (
    Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        {columns.map((col, colIdx) => (
          <td key={colIdx} className="px-3 py-2">
            <div className="h-4 bg-gray-200 rounded" style={{ width: typeof col.width === 'number' ? col.width - 20 : '100%' }}></div>
          </td>
        ))}
      </tr>
    ))
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">카페 메뉴 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅 케어 &gt; 챌린지 관리 &gt; 카페 메뉴 관리
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm">
              조회
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              size="sm"
              className="w-[32px] h-[28px] px-0 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 조회조건 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* 1행 */}
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>사업장명</span>
              <input
                type="text"
                value={filters.business_name || ''}
                onChange={(e) => handleFilterChange('business_name', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기업/사업장 코드</span>
              <input
                type="text"
                value={filters.business_code || ''}
                onChange={(e) => handleFilterChange('business_code', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>일자별 조회</span>
              <DatePicker
                value={filters.created_from ? new Date(filters.created_from) : null}
                onChange={(date) => handleFilterChange('created_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.created_to ? new Date(filters.created_to) : null}
                onChange={(date) => handleFilterChange('created_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>메뉴코드</span>
              <input
                type="text"
                value={filters.menu_code || ''}
                onChange={(e) => handleFilterChange('menu_code', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>메뉴 단가</span>
              <input
                type="number"
                value={filters.menu_price ?? ''}
                onChange={(e) => handleFilterChange('menu_price', e.target.value ? Number(e.target.value) : null)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.is_active?.includes('Y') || false}
                    onChange={(e) => {
                      const current = filters.is_active || [];
                      if (e.target.checked) {
                        handleFilterChange('is_active', [...current, 'Y']);
                      } else {
                        handleFilterChange('is_active', current.filter(v => v !== 'Y'));
                      }
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">Y</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.is_active?.includes('N') || false}
                    onChange={(e) => {
                      const current = filters.is_active || [];
                      if (e.target.checked) {
                        handleFilterChange('is_active', [...current, 'N']);
                      } else {
                        handleFilterChange('is_active', current.filter(v => v !== 'N'));
                      }
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">N</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="relative">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-[14px] font-bold text-black">카페 메뉴 관리</h2>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-[#F5F5DC]">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-semibold text-[#333]" style={{ width: col.width }}>
                        {typeof col.label === 'function' ? col.label() : col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderSkeletonRows()}</tbody>
              </table>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={menus}
              totalCount={pagination?.total}
              isLoading={isLoading}
              emptyMessage="조회 결과가 없습니다."
              getRowKey={(row) => String(row.id)}
              title="카페 메뉴 관리"
            />
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </AdminLayout>
  );
}

