'use client';

// ============================================
// 공통 데이터 테이블 컴포넌트 - 크기 조정
// ============================================

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
  title?: string;
}

// 정렬 아이콘 컴포넌트
function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <div className="flex flex-col ml-1 gap-[1px]">
      <svg 
        width="8" 
        height="5" 
        viewBox="0 0 8 5" 
        fill="none"
        className={cn(
          direction === 'asc' ? 'text-black' : 'text-gray-300'
        )}
      >
        <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
      </svg>
      <svg 
        width="8" 
        height="5" 
        viewBox="0 0 8 5" 
        fill="none"
        className={cn(
          direction === 'desc' ? 'text-black' : 'text-gray-300'
        )}
      >
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </div>
  );
}

function DataTable<T extends object>({
  columns,
  data,
  totalCount,
  sorting,
  onSort,
  onRowClick,
  isLoading,
  emptyMessage = '데이터가 없습니다.',
  getRowKey,
  title = '고객 리스트',
}: DataTableProps<T>) {
  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    if (!sorting || sorting.field !== field) return null;
    return sorting.direction;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* 테이블 타이틀 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-[16px] font-bold text-black">
          {title}
        </span>
        {totalCount !== undefined && (
          <span className="ml-3 text-[14px] text-[#888]">
            총 {totalCount}건
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* 테이블 헤더 */}
          <thead>
            <tr className="bg-[#fafafa] border-b border-gray-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-2.5 text-[13px] font-semibold text-[#333] whitespace-nowrap text-left',
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
                    {column.sortable && <SortIcon direction={getSortDirection(column.key)} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-gray-100">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-[13px] text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row) : rowIndex}
                  className={cn(
                    'border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
                    rowIndex % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-2.5 text-[13px] text-[#333] whitespace-nowrap',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render((row as Record<string, unknown>)[column.key], row)
                        : ((row as Record<string, unknown>)[column.key] as ReactNode) ?? '-'}
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
        className="px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이전
      </button>
      
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 text-[13px] rounded',
              currentPage === page
                ? 'bg-[#737373] text-white font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-1 text-gray-400">
            {page}
          </span>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-[13px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        다음
      </button>
    </div>
  );
}

export { DataTable, Pagination };
