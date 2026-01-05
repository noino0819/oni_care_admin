'use client';

// ============================================
// 컨텐츠 관리 페이지 - 기획서 스펙 반영
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal, DatePicker } from '@/components/common';
import { ContentFormModal } from './ContentFormModal';
import { useContents } from '@/hooks/useContents';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus } from 'lucide-react';
import type { ContentSearchFilters, SortConfig, TableColumn, ContentListItem, ContentCategory } from '@/types';

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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const { contents, pagination, categories, isLoading, refetch, deleteContents } = useContents(
    filters,
    sort,
    page,
    20
  );

  // 외부 클릭 시 카테고리 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (key: keyof ContentSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 카테고리 체크박스 토글
  const handleCategoryCheck = (categoryId: number) => {
    setSelectedCategoryIds(prev => {
      const newIds = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      // filters에도 반영
      console.log('[Category Check] newIds:', newIds);
      setFilters(f => {
        const newFilters = { ...f, category_ids: newIds.length > 0 ? newIds : undefined };
        console.log('[Category Check] newFilters:', newFilters);
        return newFilters;
      });
      return newIds;
    });
  };

  // 선택된 카테고리명 가져오기
  const getSelectedCategoryNames = () => {
    if (!categories || selectedCategoryIds.length === 0) return '전체';
    const names = categories
      .filter((cat: ContentCategory) => selectedCategoryIds.includes(cat.id))
      .map((cat: ContentCategory) => cat.category_name);
    if (names.length === 0) return '전체';
    if (names.length > 2) return `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}개`;
    return names.join(', ');
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      title: '',
      category_id: undefined,
      category_ids: undefined,
      tag: '',
      visibility_scope: [],
      company_code: '',
      updated_from: '',
      updated_to: '',
      start_from: '',
      start_to: '',
      has_quote: '',
    });
    setSelectedCategoryIds([]);  // 카테고리 선택도 초기화
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
              <div ref={categoryDropdownRef} className="relative">
                <div 
                  className={`${inputClass} w-[200px] cursor-pointer flex items-center justify-between`}
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                >
                  <span className="text-[13px] text-[#333] truncate">{getSelectedCategoryNames()}</span>
                  <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {isCategoryDropdownOpen && categories && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20 p-5 min-w-[550px]">
                    {/* 카테고리 타입별 그룹화 */}
                    <div className="flex gap-8">
                      {['관심사', '질병', '운동'].map((type) => {
                        const typeCategories = categories.filter(
                          (cat: ContentCategory) => cat.category_type === type
                        );
                        return (
                          <div key={type} className="min-w-[140px]">
                            {/* 카테고리 타입 헤더 */}
                            <div className="font-bold text-[15px] text-black pb-2 mb-3 border-b-2 border-black">
                              {type}
                            </div>
                            {/* 체크박스 리스트 */}
                            <div className="space-y-3">
                              {typeCategories.length > 0 ? (
                                typeCategories.map((cat: ContentCategory) => (
                                  <label 
                                    key={cat.id} 
                                    className="flex items-center gap-3 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCategoryIds.includes(cat.id)}
                                      onChange={() => handleCategoryCheck(cat.id)}
                                      className="w-[18px] h-[18px] border-2 border-gray-400 rounded-sm appearance-none checked:bg-black checked:border-black relative cursor-pointer
                                        after:content-[''] after:absolute after:hidden checked:after:block
                                        after:left-[5px] after:top-[1px] after:w-[5px] after:h-[10px]
                                        after:border-white after:border-r-2 after:border-b-2 after:rotate-45"
                                    />
                                    <span className="text-[14px] text-[#333]">{cat.category_name}</span>
                                  </label>
                                ))
                              ) : (
                                <span className="text-[13px] text-gray-400">항목 없음</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
              <DatePicker
                value={filters.updated_from ? new Date(filters.updated_from) : null}
                onChange={(date) => handleFilterChange('updated_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.updated_to ? new Date(filters.updated_to) : null}
                onChange={(date) => handleFilterChange('updated_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder="종료일"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>게시기간</span>
              <DatePicker
                value={filters.start_from ? new Date(filters.start_from) : null}
                onChange={(date) => handleFilterChange('start_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.start_to ? new Date(filters.start_to) : null}
                onChange={(date) => handleFilterChange('start_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder="종료일"
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

            <div className="flex items-center gap-2">
              <span className={labelClass}>명언여부</span>
              <select
                value={filters.has_quote || ''}
                onChange={(e) => handleFilterChange('has_quote', e.target.value)}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
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


