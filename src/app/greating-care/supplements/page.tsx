'use client';

// ============================================
// 영양제 DB 관리 페이지
// 기획서 반영: 제조사 컬럼 앞으로, 라인 클릭 수정, 영역 확장
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal } from '@/components/common';
import { SupplementFormModal } from './SupplementFormModal';
import { IngredientMappingModal } from './IngredientMappingModal';
import { 
  useSupplements, 
  useSupplementIngredients, 
  useSupplementFunctionalities,
  useDeleteSupplements,
  useDeleteSupplementIngredients,
  type SupplementSearchFilters,
  type Supplement,
  type SupplementIngredient,
  type SupplementFunctionality 
} from '@/hooks/useSupplements';
import { useProductFormUnits, useDosageUnits } from '@/hooks/useUnits';
import { RefreshCw, Plus } from 'lucide-react';
import type { TableColumn } from '@/types';

export default function SupplementsPage() {
  // 검색 필터
  const [filters, setFilters] = useState<SupplementSearchFilters>({
    product_name: '',
    report_number: '',
    ingredient_name: '',
    functionality: '',
    default_intake_amount: '',
    default_intake_time: '',
    product_form: '',
    manufacturer: '',
    is_active: '',
  });

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>([]);
  
  // 모달 상태
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIngredientDeleteConfirm, setShowIngredientDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // 탭 상태 (성분 및 함량 / 기능성)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'functionalities'>('ingredients');

  // 데이터 조회
  const { supplements, pagination, isLoading, refetch } = useSupplements(filters, page);
  const { ingredients, refetch: refetchIngredients } = useSupplementIngredients(selectedSupplement?.id || null);
  const { functionalities } = useSupplementFunctionalities(selectedSupplement?.id || null);
  
  // 단위 데이터
  const { units: formUnits } = useProductFormUnits();
  const { units: dosageUnits } = useDosageUnits();
  
  // 삭제 뮤테이션
  const { deleteSupplements, isDeleting } = useDeleteSupplements();
  const { deleteIngredients, isDeleting: isDeletingIngredients } = useDeleteSupplementIngredients(selectedSupplement?.id || null);

  // 필터 변경
  const handleFilterChange = (key: keyof SupplementSearchFilters, value: string) => {
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
      product_name: '',
      report_number: '',
      ingredient_name: '',
      functionality: '',
      default_intake_amount: '',
      default_intake_time: '',
      product_form: '',
      manufacturer: '',
      is_active: '',
    });
    setPage(1);
    setSelectedSupplement(null);
    setSelectedIds([]);
    setSelectedIngredientIds([]);
  };

  // 엔터 키 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 영양제 삭제
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteSupplements({ ids: selectedIds });
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      setSelectedSupplement(null);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  // 성분 매핑 삭제
  const handleDeleteIngredients = async () => {
    if (selectedIngredientIds.length === 0 || !selectedSupplement) return;
    try {
      await deleteIngredients({ mapping_ids: selectedIngredientIds });
      setSelectedIngredientIds([]);
      setShowIngredientDeleteConfirm(false);
      refetchIngredients();
    } catch {
      setAlertMessage('성분 삭제 중 오류가 발생했습니다.');
    }
  };

  // 영양제 선택 시 성분/기능성 조회 (기획서: 라인 클릭 시 수정 팝업)
  const handleSupplementSelect = (supplement: Supplement) => {
    setSelectedSupplement(supplement);
    setSelectedIngredientIds([]);
  };

  // 영양제 라인 더블클릭 시 수정 팝업
  const handleSupplementDoubleClick = (supplement: Supplement) => {
    setEditingId(supplement.id);
  };

  // 영양제 목록 컬럼 (기획서: 제조사 컬럼 앞쪽에 노출)
  const supplementColumns: TableColumn<Supplement>[] = [
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
      key: 'product_report_number',
      label: '품목제조보고번호',
      width: 140,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'manufacturer',
      label: '제조사',
      width: 80,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'product_name',
      label: '영양제명',
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="truncate block max-w-[150px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'product_form',
      label: '제품형태',
      width: 70,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'dosage',
      label: '용량',
      width: 80,
      render: (_, row) => row.dosage ? `${row.dosage}${row.dosage_unit || 'mg'}` : '-',
    },
    {
      key: 'intake_method',
      label: '섭취방법',
      width: 140,
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="truncate block max-w-[140px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'default_intake_time',
      label: '기본 섭취 시간',
      width: 100,
      render: (value) => (value as string) || '09:00',
    },
    {
      key: 'default_intake_amount',
      label: '기본 섭취량',
      width: 90,
      render: (_, row) => row.default_intake_amount ? `${row.default_intake_amount}${row.default_intake_unit || '정'}` : '-',
    },
  ];

  // 성분 및 함량 컬럼 (기획서: 원료명 컬럼 추가)
  const ingredientColumns: TableColumn<SupplementIngredient>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIngredientIds.includes(row.mapping_id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedIngredientIds(prev => [...prev, row.mapping_id]);
            } else {
              setSelectedIngredientIds(prev => prev.filter(id => id !== row.mapping_id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'external_name',
      label: '원료명',
      render: (_, row) => row.external_name || row.internal_name,
    },
    {
      key: 'content_amount',
      label: '함량',
      width: 80,
      render: (value) => value?.toString() || '-',
    },
    {
      key: 'content_unit',
      label: '단위',
      width: 60,
      render: (value) => (value as string) || 'mg',
    },
  ];

  // 기능성 컬럼 (기획서: 해당 원료 표시)
  const functionalityColumns: TableColumn<SupplementFunctionality>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: () => (
        <input
          type="checkbox"
          disabled
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373] opacity-50"
        />
      ),
    },
    {
      key: 'functionality_code',
      label: '코드',
      width: 60,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'content',
      label: '주요 기능성',
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="line-clamp-2" title={text}>{text}</span>;
      },
    },
    {
      key: 'ingredient_names',
      label: '해당 원료',
      width: 120,
      render: (value) => {
        const names = value as string[];
        const text = names?.join(', ') || '-';
        return <span className="truncate block max-w-[120px]" title={text}>{text}</span>;
      },
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
            <h1 className="text-[18px] font-bold text-black">영양제 DB 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅 케어 &gt; 기록 관리 &gt; 영양제 DB 관리
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
              <span className={labelClass}>영양제명</span>
              <input
                type="text"
                value={filters.product_name}
                onChange={(e) => handleFilterChange('product_name', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>품목제조보고번호</span>
              <input
                type="text"
                value={filters.report_number}
                onChange={(e) => handleFilterChange('report_number', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>성분명</span>
              <input
                type="text"
                value={filters.ingredient_name}
                onChange={(e) => handleFilterChange('ingredient_name', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기능성</span>
              <input
                type="text"
                value={filters.functionality}
                onChange={(e) => handleFilterChange('functionality', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={labelClass}>기본 섭취량</span>
              <input
                type="text"
                value={filters.default_intake_amount}
                onChange={(e) => handleFilterChange('default_intake_amount', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[100px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기본 섭취시간</span>
              <input
                type="time"
                value={filters.default_intake_time}
                onChange={(e) => handleFilterChange('default_intake_time', e.target.value)}
                className={`${inputClass} w-[120px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>제품형태</span>
              <select
                value={filters.product_form}
                onChange={(e) => handleFilterChange('product_form', e.target.value)}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">전체</option>
                {formUnits.map(unit => (
                  <option key={unit.id} value={unit.unit_name}>{unit.unit_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>제조사</span>
              <input
                type="text"
                value={filters.manufacturer}
                onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${inputClass} w-[140px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className={`${selectClass} w-[80px]`}
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2분할 레이아웃 (기획서: 영역 확장) */}
        <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {/* 왼쪽: 영양제 리스트 */}
          <div className="flex-[6] min-w-0 flex flex-col">
            <div className="relative flex-1">
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
                  추가
                </Button>
              </div>
              <DataTable
                columns={supplementColumns}
                data={supplements}
                totalCount={pagination?.total}
                onRowClick={(row) => handleSupplementSelect(row)}
                onRowDoubleClick={(row) => handleSupplementDoubleClick(row)}
                selectedRowKey={selectedSupplement?.id}
                isLoading={isLoading}
                emptyMessage="조회 결과가 없습니다."
                getRowKey={(row) => row.id}
                title="영양제 리스트"
                maxHeight="calc(100vh - 380px)"
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

          {/* 오른쪽: 탭 구조 (성분 및 함량 / 기능성) */}
          <div className="flex-[4] min-w-[400px] flex flex-col">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-200 mb-0">
              <button
                onClick={() => setActiveTab('ingredients')}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === 'ingredients'
                    ? 'text-[#333] border-[#333] bg-[#333] text-white rounded-t'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                성분 및 함량
              </button>
              <button
                onClick={() => setActiveTab('functionalities')}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === 'functionalities'
                    ? 'text-[#333] border-[#333] bg-[#333] text-white rounded-t'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                기능성
              </button>
              <div className="flex-1" />
              {/* 버튼: 성분 및 함량 탭일 때만 표시 */}
              {activeTab === 'ingredients' && (
                <div className="flex gap-2 items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedIngredientIds.length > 0 && setShowIngredientDeleteConfirm(true)}
                    disabled={!selectedSupplement || selectedIngredientIds.length === 0 || isDeletingIngredients}
                  >
                    삭제
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsIngredientModalOpen(true)}
                    disabled={!selectedSupplement}
                  >
                    추가
                  </Button>
                </div>
              )}
            </div>

            {/* 탭 내용 */}
            <div className="flex-1 border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
              {activeTab === 'ingredients' ? (
                <DataTable
                  columns={ingredientColumns}
                  data={ingredients}
                  totalCount={ingredients.length}
                  isLoading={false}
                  emptyMessage={selectedSupplement ? '매핑된 성분이 없습니다.' : '영양제를 선택해주세요.'}
                  getRowKey={(row) => row.mapping_id.toString()}
                  maxHeight="calc(100vh - 380px)"
                  showTitle={false}
                />
              ) : (
                <DataTable
                  columns={functionalityColumns}
                  data={functionalities}
                  totalCount={functionalities.length}
                  isLoading={false}
                  emptyMessage={selectedSupplement ? '연결된 기능성이 없습니다.' : '영양제를 선택해주세요.'}
                  getRowKey={(row) => row.functionality_id.toString()}
                  maxHeight="calc(100vh - 380px)"
                  showTitle={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 영양제 등록/수정 모달 */}
      <SupplementFormModal
        supplementId={editingId}
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
        formUnits={formUnits}
        dosageUnits={dosageUnits}
      />

      {/* 성분 및 함량 매핑 모달 */}
      <IngredientMappingModal
        productId={selectedSupplement?.id || null}
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        onSaved={() => {
          refetchIngredients();
          setIsIngredientModalOpen(false);
        }}
        currentIngredients={ingredients}
      />

      {/* 영양제 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 영양제를 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />

      {/* 성분 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showIngredientDeleteConfirm}
        onClose={() => setShowIngredientDeleteConfirm(false)}
        onConfirm={handleDeleteIngredients}
        message={`선택한 ${selectedIngredientIds.length}개 성분 매핑을 삭제하시겠습니까?`}
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

