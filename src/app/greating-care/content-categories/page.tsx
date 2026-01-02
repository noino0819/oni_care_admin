'use client';

// ============================================
// 컨텐츠 카테고리 관리 페이지 - 기획서 스펙 반영
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal } from '@/components/common';
import { CategoryFormModal } from './CategoryFormModal';
import { SubcategoryFormModal } from './SubcategoryFormModal';
import { useCategoriesWithSubcategories, deleteCategory, deleteSubcategory } from '@/hooks/useCategories';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import type { CategorySearchFilters, SortConfig, TableColumn, ContentCategory, ContentSubcategory } from '@/types';

export default function ContentCategoriesPage() {
  const [filters, setFilters] = useState<CategorySearchFilters>({
    category_name: '',
    subcategory_name: '',
    is_active: '',
  });

  const [sort, setSort] = useState<SortConfig>({
    field: 'display_order',
    direction: 'asc',
  });
  const [page, setPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [parentCategoryForSubcategory, setParentCategoryForSubcategory] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'subcategory'; id: number } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { categories, subcategories, pagination, isLoading, refetch } = useCategoriesWithSubcategories(
    filters,
    sort,
    page,
    20
  );

  const handleFilterChange = (key: keyof CategorySearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      category_name: '',
      subcategory_name: '',
      is_active: '',
    });
    setSort({ field: 'display_order', direction: 'asc' });
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

  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.id);
      } else {
        await deleteSubcategory(deleteTarget.id);
      }
      setDeleteTarget(null);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddSubcategory = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setParentCategoryForSubcategory(categoryId);
    setIsCreatingSubcategory(true);
  };

  // 대분류 테이블 컬럼
  const categoryColumns: TableColumn<ContentCategory>[] = [
    {
      key: 'expand',
      label: '',
      width: 40,
      render: (_, row) => {
        const subCount = subcategories.filter(s => s.category_id === row.id).length;
        if (subCount === 0) return null;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {expandedCategories.has(row.id) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        );
      },
    },
    {
      key: 'category_type',
      label: '카테고리 유형',
      sortable: true,
    },
    {
      key: 'category_name',
      label: '대분류명',
      sortable: true,
    },
    {
      key: 'subcategory_types',
      label: '중분류 유형',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'subcategory_count',
      label: '중분류 수',
      align: 'center',
      render: (_, row) => {
        const count = subcategories.filter(s => s.category_id === row.id).length;
        return count;
      },
    },
    {
      key: 'display_order',
      label: '표시순서',
      sortable: true,
      align: 'center',
    },
    {
      key: 'is_active',
      label: '사용여부',
      align: 'center',
      render: (value) => (value as boolean) ? 'Y' : 'N',
    },
    {
      key: 'updated_at',
      label: '최종수정일',
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_, row) => (
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => handleAddSubcategory(row.id, e)}
            className="text-xs px-2 py-1"
          >
            +중분류
          </Button>
        </div>
      ),
    },
  ];

  // 중분류 테이블 컬럼
  const subcategoryColumns: TableColumn<ContentSubcategory>[] = [
    {
      key: 'subcategory_name',
      label: '중분류명',
    },
    {
      key: 'display_order',
      label: '표시순서',
      align: 'center',
    },
    {
      key: 'is_active',
      label: '사용여부',
      align: 'center',
      render: (value) => (value as boolean) ? 'Y' : 'N',
    },
    {
      key: 'updated_at',
      label: '최종수정일',
      render: (value) => formatDate(value as string),
    },
    {
      key: 'actions',
      label: '',
      width: 60,
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget({ type: 'subcategory', id: row.id });
          }}
          className="text-xs px-2 py-1 text-red-500"
        >
          삭제
        </Button>
      ),
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">컨텐츠 카테고리 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 컨텐츠 카테고리 관리
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>대분류명</span>
              <input
                type="text"
                value={filters.category_name}
                onChange={(e) => handleFilterChange('category_name', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>중분류명</span>
              <input
                type="text"
                value={filters.subcategory_name}
                onChange={(e) => handleFilterChange('subcategory_name', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">전체</option>
                <option value="Y">사용</option>
                <option value="N">미사용</option>
              </select>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 - 대분류 */}
        <div className="relative">
          <div className="absolute right-0 top-0 flex gap-2 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreatingCategory(true)}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 대분류 추가
            </Button>
          </div>

          <DataTable
            columns={categoryColumns}
            data={categories}
            totalCount={pagination?.total}
            sorting={sort}
            onSort={handleSort}
            onRowClick={(row) => setSelectedCategoryId(row.id)}
            isLoading={isLoading}
            emptyMessage="조회 결과가 없습니다."
            getRowKey={(row) => row.id.toString()}
            title="대분류 카테고리"
            renderRowExpansion={(row) => {
              if (!expandedCategories.has(row.id)) return null;
              const subs = subcategories.filter(s => s.category_id === row.id);
              if (subs.length === 0) return null;
              
              return (
                <tr>
                  <td colSpan={categoryColumns.length} className="p-0">
                    <div className="bg-gray-50 border-t border-b border-gray-200 pl-12 py-2">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium">중분류명</th>
                            <th className="text-center py-2 px-3 font-medium w-[80px]">표시순서</th>
                            <th className="text-center py-2 px-3 font-medium w-[80px]">사용여부</th>
                            <th className="text-left py-2 px-3 font-medium w-[120px]">최종수정일</th>
                            <th className="w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((sub) => (
                            <tr
                              key={sub.id}
                              className="border-b border-gray-100 hover:bg-gray-100 cursor-pointer"
                              onClick={() => setSelectedSubcategoryId(sub.id)}
                            >
                              <td className="py-2 px-3">{sub.subcategory_name}</td>
                              <td className="text-center py-2 px-3">{sub.display_order}</td>
                              <td className="text-center py-2 px-3">{sub.is_active ? 'Y' : 'N'}</td>
                              <td className="py-2 px-3">{formatDate(sub.updated_at)}</td>
                              <td className="py-2 px-3">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: 'subcategory', id: sub.id });
                                  }}
                                  className="text-xs px-2 py-1 text-red-500"
                                >
                                  삭제
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              );
            }}
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

      {/* 대분류 등록/수정 모달 */}
      <CategoryFormModal
        categoryId={selectedCategoryId}
        isOpen={isCreatingCategory || !!selectedCategoryId}
        onClose={() => {
          setSelectedCategoryId(null);
          setIsCreatingCategory(false);
        }}
        onSaved={() => {
          refetch();
          setSelectedCategoryId(null);
          setIsCreatingCategory(false);
        }}
        onDelete={(id) => setDeleteTarget({ type: 'category', id })}
      />

      {/* 중분류 등록/수정 모달 */}
      <SubcategoryFormModal
        subcategoryId={selectedSubcategoryId}
        parentCategoryId={parentCategoryForSubcategory}
        isOpen={isCreatingSubcategory || !!selectedSubcategoryId}
        onClose={() => {
          setSelectedSubcategoryId(null);
          setIsCreatingSubcategory(false);
          setParentCategoryForSubcategory(null);
        }}
        onSaved={() => {
          refetch();
          setSelectedSubcategoryId(null);
          setIsCreatingSubcategory(false);
          setParentCategoryForSubcategory(null);
        }}
        onDelete={(id) => setDeleteTarget({ type: 'subcategory', id })}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`이 ${deleteTarget?.type === 'category' ? '대분류' : '중분류'} 카테고리를 삭제하시겠습니까?`}
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


