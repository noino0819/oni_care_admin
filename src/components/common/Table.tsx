'use client';

// ============================================
// 공통 데이터 테이블 컴포넌트
// ============================================

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { TableColumn, SortConfig } from '@/types';

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  totalCount?: number;
  sorting?: SortConfig;
  onSort?: (field: string) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  getRowKey?: (row: T) => string;
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  totalCount,
  sorting,
  onSort,
  onRowClick,
  isLoading,
  emptyMessage = '데이터가 없습니다.',
  getRowKey,
}: DataTableProps<T>) {
  const renderSortIcon = (field: string) => {
    if (!sorting || sorting.field !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sorting.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-gray-700" />;
    }
    return <ChevronDown className="w-4 h-4 text-gray-700" />;
  };

  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 테이블 헤더 정보 */}
      {totalCount !== undefined && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <span className="text-sm font-medium text-gray-700">
            고객 리스트
          </span>
          <span className="ml-2 text-sm text-gray-500">
            총 {totalCount}건
          </span>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 select-none'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleHeaderClick(column)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.label}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // 로딩 스켈레톤
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // 빈 상태
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // 데이터 행
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row) : rowIndex}
                  className={cn(
                    'border-b last:border-0 hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-900 whitespace-nowrap',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : (row[column.key] as ReactNode) ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 페이지네이션 컴포넌트
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    const end = Math.min(totalPages, start + showPages - 1);
    
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이전
      </button>
      
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 text-sm rounded',
              currentPage === page
                ? 'bg-[#C8E600] text-black font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 text-gray-400">
            {page}
          </span>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        다음
      </button>
    </div>
  );
}

export { DataTable, Pagination };

