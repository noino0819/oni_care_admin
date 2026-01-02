'use client';

// ============================================
// 컨텐츠 관리 페이지 - 기획서 스펙 반영
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal } from '@/components/common';
import { ContentFormModal } from './ContentFormModal';
import { useContents } from '@/hooks/useContents';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus } from 'lucide-react';
import type { ContentSearchFilters, SortConfig, TableColumn, ContentListItem } from '@/types';

// 공개범위 옵션
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

export default function ContentsPage() {
  const [filters, setFilters] = useState<ContentSearchFilters>({
    title: '',
    category_id: undefined,
    tag: '',
    visibility_scope: [],
    company_code: '',
    updated_from: '',
    updated_to: '',
    start_from: '',
    start_to: '',
    has_quote: '',
  });

  const [sort, setSort] = useState<SortConfig>({
    field: 'updated_at',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { contents, pagination, categories, isLoading, refetch, deleteContents } = useContents(
    filters,
    sort,
    page,
    20
  );

  const handleFilterChange = (key: keyof ContentSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      title: '',
      category_id: undefined,
      tag: '',
      visibility_scope: [],
      company_code: '',
      updated_from: '',
      updated_to: '',
      start_from: '',
      start_to: '',
      has_quote: '',
    });
    setSort({ field: 'updated_at', direction: 'desc' });
    setPage(1);
  };

  const handleSort = useCallback((field: string) => {
    setSort(prev => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  }, []);

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteContents(selectedIds);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const columns: TableColumn<ContentListItem>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedIds(prev => [...prev, row.id]);
            } else {
              setSelectedIds(prev => prev.filter(id => id !== row.id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'title',
      label: '컨텐츠 제목',
      sortable: true,
    },
    {
      key: 'category_names',
      label: '컨텐츠 카테고리',
      render: (value) => {
        const names = value as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {names?.map((name, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[12px]">
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'tags',
      label: '컨텐츠 태그',
      render: (value) => {
        const tags = value as string[];
        return tags?.join(' | ') || '-';
      },
    },
    {
      key: 'visibility_scope',
      label: '컨텐츠 노출범위',
      render: (value) => {
        const scopes = value as string[];
        const labels = scopes?.map(s => {
          const opt = VISIBILITY_OPTIONS.find(o => o.value === s);
          return opt?.label || s;
        });
        return labels?.join(', ') || '-';
      },
    },
    {
      key: 'start_date',
      label: '컨텐츠 게시기간',
      render: (_, row) => {
        if (!row.start_date && !row.end_date) return '-';
        return `${formatDate(row.start_date || '')}~${formatDate(row.end_date || '')}`;
      },
    },
    {
      key: 'updated_at',
      label: '최종수정일',
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    {
      key: 'updated_by',
      label: '수정자',
      render: (value) => (value as string) || '-',
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">컨텐츠관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 컨텐츠 관리
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
              <span className={labelClass}>제목</span>
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleFilterChange('title', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>카테고리</span>
              <select
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
                className={`${selectClass} w-[160px]`}
              >
                <option value="">전체</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>태그</span>
              <input
                type="text"
                value={filters.tag}
                onChange={(e) => handleFilterChange('tag', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>공개범위</span>
              <div className="flex items-center gap-3">
                {VISIBILITY_OPTIONS.map(option => (
                  <label key={option.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.visibility_scope?.includes(option.value) || false}
                      onChange={(e) => {
                        const current = filters.visibility_scope || [];
                        if (e.target.checked) {
                          handleFilterChange('visibility_scope', [...current, option.value]);
                        } else {
                          handleFilterChange('visibility_scope', current.filter(v => v !== option.value));
                        }
                      }}
                      className={checkboxClass}
                    />
                    <span className="text-[13px] text-[#333]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>최종수정일</span>
              <input
                type="date"
                value={filters.updated_from}
                onChange={(e) => handleFilterChange('updated_from', e.target.value)}
                className={`${inputClass} w-[130px]`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={filters.updated_to}
                onChange={(e) => handleFilterChange('updated_to', e.target.value)}
                className={`${inputClass} w-[130px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>게시기간</span>
              <input
                type="date"
                value={filters.start_from}
                onChange={(e) => handleFilterChange('start_from', e.target.value)}
                className={`${inputClass} w-[130px]`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={filters.start_to}
                onChange={(e) => handleFilterChange('start_to', e.target.value)}
                className={`${inputClass} w-[130px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>상세범위(기업코드)</span>
              <input
                type="text"
                value={filters.company_code}
                onChange={(e) => handleFilterChange('company_code', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="relative">
          <div className="absolute right-0 top-0 flex gap-2 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectedIds.length > 0 && setShowDeleteConfirm(true)}
              disabled={selectedIds.length === 0}
            >
              삭제
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={contents}
            totalCount={pagination?.total}
            sorting={sort}
            onSort={handleSort}
            onRowClick={(row) => setEditingId(row.id)}
            isLoading={isLoading}
            emptyMessage="조회 결과가 없습니다."
            getRowKey={(row) => row.id}
            title="컨텐츠 리스트"
          />
        </div>

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* 컨텐츠 등록/수정 모달 */}
      <ContentFormModal
        contentId={editingId}
        isOpen={isCreating || !!editingId}
        onClose={() => {
          setEditingId(null);
          setIsCreating(false);
        }}
        onSaved={() => {
          refetch();
          setEditingId(null);
          setIsCreating(false);
        }}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 컨텐츠를 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </AdminLayout>
  );
}


