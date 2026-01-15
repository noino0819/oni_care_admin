'use client';

// ============================================
// 기능성 성분 관리 페이지
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal } from '@/components/common';
import { FunctionalIngredientFormModal } from './FunctionalIngredientFormModal';
import { FunctionalityMappingModal } from './FunctionalityMappingModal';
import {
  useFunctionalIngredients,
  useIngredientFunctionalities,
  useDeleteFunctionalIngredients,
  useRemoveIngredientFunctionalities,
  type FunctionalIngredientSearchFilters,
  type FunctionalIngredient,
  type IngredientFunctionality,
} from '@/hooks/useFunctionalIngredients';
import { RefreshCw, Plus } from 'lucide-react';
import type { TableColumn } from '@/types';

export default function FunctionalIngredientsPage() {
  // 검색 필터
  const [filters, setFilters] = useState<FunctionalIngredientSearchFilters>({
    ingredient_code: '',
    internal_name: '',
    external_name: '',
    indicator_component: '',
    functionality_content: '',
    functionality_code: '',
  });

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<FunctionalIngredient | null>(null);
  const [selectedFunctionalityIds, setSelectedFunctionalityIds] = useState<number[]>([]);

  // 모달 상태
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFunctionalityModalOpen, setIsFunctionalityModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFunctionalityDeleteConfirm, setShowFunctionalityDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 데이터 조회
  const { ingredients, pagination, isLoading, refetch } = useFunctionalIngredients(filters, page);
  const { functionalities, refetch: refetchFunctionalities } = useIngredientFunctionalities(selectedIngredient?.id || null);

  // 삭제 뮤테이션
  const { deleteIngredients, isDeleting } = useDeleteFunctionalIngredients();
  const { removeFunctionalities, isRemoving } = useRemoveIngredientFunctionalities(selectedIngredient?.id || null);

  // 필터 변경
  const handleFilterChange = (key: keyof FunctionalIngredientSearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 검색
  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  // 초기화
  const handleRefresh = () => {
    setFilters({
      ingredient_code: '',
      internal_name: '',
      external_name: '',
      indicator_component: '',
      functionality_content: '',
      functionality_code: '',
    });
    setPage(1);
    setSelectedIngredient(null);
    setSelectedIds([]);
    setSelectedFunctionalityIds([]);
  };

  // 엔터 키 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 기능성 성분 삭제
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteIngredients({ ids: selectedIds });
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      setSelectedIngredient(null);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  // 기능성 내용 매핑 해제
  const handleRemoveFunctionalities = async () => {
    if (selectedFunctionalityIds.length === 0 || !selectedIngredient) return;
    try {
      await removeFunctionalities({ functionality_ids: selectedFunctionalityIds });
      setSelectedFunctionalityIds([]);
      setShowFunctionalityDeleteConfirm(false);
      refetchFunctionalities();
    } catch {
      setAlertMessage('매핑 해제 중 오류가 발생했습니다.');
    }
  };

  // 성분 선택 시
  const handleIngredientSelect = (ingredient: FunctionalIngredient) => {
    setSelectedIngredient(ingredient);
    setSelectedFunctionalityIds([]);
  };

  // 성분 더블클릭 시 수정 팝업
  const handleIngredientDoubleClick = (ingredient: FunctionalIngredient) => {
    setEditingId(ingredient.id);
  };

  // 기능성 성분 목록 컬럼
  const ingredientColumns: TableColumn<FunctionalIngredient>[] = [
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
      key: 'ingredient_code',
      label: '성분코드',
      width: 80,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'internal_name',
      label: '성분명(내부)',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'external_name',
      label: '성분명(외부)',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'indicator_component',
      label: '지표성분',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'daily_intake_min',
      label: '권장섭취량(하한)',
      width: 110,
      render: (_, row) => row.daily_intake_min ? `${row.daily_intake_min}` : '-',
    },
    {
      key: 'daily_intake_max',
      label: '권장섭취량(상한)',
      width: 110,
      render: (_, row) => row.daily_intake_max ? `${row.daily_intake_max}` : '-',
    },
    {
      key: 'daily_intake_unit',
      label: '단위',
      width: 60,
      render: (value) => (value as string) || 'mg',
    },
    {
      key: 'priority_display',
      label: '우선노출',
      width: 70,
      render: (value) => (value as boolean) ? 'Y' : 'N',
    },
  ];

  // 기능성 내용 컬럼
  const functionalityColumns: TableColumn<IngredientFunctionality>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedFunctionalityIds.includes(row.functionality_id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedFunctionalityIds(prev => [...prev, row.functionality_id]);
            } else {
              setSelectedFunctionalityIds(prev => prev.filter(id => id !== row.functionality_id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'functionality_code',
      label: '코드',
      width: 80,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'content',
      label: '기능성 내용',
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="line-clamp-2" title={text}>{text}</span>;
      },
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">기능성 성분 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅 케어 &gt; 기록 관리 &gt; 기능성 성분 관리
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
          <div className="flex items-center gap-6 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={labelClass}>기능성 성분 코드</span>
              <input
                type="text"
                value={filters.ingredient_code}
                onChange={(e) => handleFilterChange('ingredient_code', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>성분명(내부)</span>
              <input
                type="text"
                value={filters.internal_name}
                onChange={(e) => handleFilterChange('internal_name', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>성분명(외부)</span>
              <input
                type="text"
                value={filters.external_name}
                onChange={(e) => handleFilterChange('external_name', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>지표성분</span>
              <input
                type="text"
                value={filters.indicator_component}
                onChange={(e) => handleFilterChange('indicator_component', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={labelClass}>기능성 내용</span>
              <input
                type="text"
                value={filters.functionality_content}
                onChange={(e) => handleFilterChange('functionality_content', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[200px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기능성 내용 코드</span>
              <input
                type="text"
                value={filters.functionality_code}
                onChange={(e) => handleFilterChange('functionality_code', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>
          </div>
        </div>

        {/* 2분할 레이아웃 */}
        <div className="flex gap-4">
          {/* 왼쪽: 기능성 성분 리스트 */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute right-0 top-0 flex gap-2 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => selectedIds.length > 0 && setShowDeleteConfirm(true)}
                  disabled={selectedIds.length === 0 || isDeleting}
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
                columns={ingredientColumns}
                data={ingredients}
                totalCount={pagination?.total}
                onRowClick={(row) => handleIngredientSelect(row)}
                onRowDoubleClick={(row) => handleIngredientDoubleClick(row)}
                selectedRowKey={selectedIngredient?.id}
                isLoading={isLoading}
                emptyMessage="조회 결과가 없습니다."
                getRowKey={(row) => row.id}
                title="기능성 성분 리스트"
                maxHeight="calc(100vh - 340px)"
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

          {/* 오른쪽: 기능성 내용 리스트 */}
          <div className="w-[400px]">
            <div className="relative">
              <div className="absolute right-0 top-0 flex gap-2 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => selectedFunctionalityIds.length > 0 && setShowFunctionalityDeleteConfirm(true)}
                  disabled={!selectedIngredient || selectedFunctionalityIds.length === 0 || isRemoving}
                >
                  삭제
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFunctionalityModalOpen(true)}
                  disabled={!selectedIngredient}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <DataTable
                columns={functionalityColumns}
                data={functionalities}
                totalCount={functionalities.length}
                isLoading={false}
                emptyMessage={selectedIngredient ? '매핑된 기능성 내용이 없습니다.' : '성분을 선택해주세요.'}
                getRowKey={(row) => row.functionality_id}
                title="기능성 내용 리스트"
                maxHeight="calc(100vh - 340px)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 기능성 성분 등록/수정 모달 */}
      <FunctionalIngredientFormModal
        ingredientId={editingId}
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

      {/* 기능성 내용 매핑 모달 */}
      <FunctionalityMappingModal
        ingredientId={selectedIngredient?.id || null}
        isOpen={isFunctionalityModalOpen}
        onClose={() => setIsFunctionalityModalOpen(false)}
        onSaved={() => {
          refetchFunctionalities();
          setIsFunctionalityModalOpen(false);
        }}
        currentFunctionalities={functionalities}
      />

      {/* 성분 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 기능성 성분을 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />

      {/* 기능성 내용 매핑 해제 확인 모달 */}
      <ConfirmModal
        isOpen={showFunctionalityDeleteConfirm}
        onClose={() => setShowFunctionalityDeleteConfirm(false)}
        onConfirm={handleRemoveFunctionalities}
        message={`선택한 ${selectedFunctionalityIds.length}개 기능성 내용 매핑을 해제하시겠습니까?`}
        cancelText="취소"
        confirmText="해제"
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

