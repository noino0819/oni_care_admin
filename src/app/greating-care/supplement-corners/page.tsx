'use client';

// ============================================
// 영양제 코너 관리 페이지
// ============================================

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { DataTable, Pagination, AlertModal, ConfirmModal, Button } from '@/components/common';
import { 
  useSupplementCorners, 
  useCornerProducts,
  useUpdateCorner,
  useDeleteCorner,
  useDeleteCornerProduct,
  type SupplementCorner,
  type CornerProduct
} from '@/hooks/useSupplementCorners';
import { CornerFormModal } from './CornerFormModal';
import { ProductSearchModal } from './ProductSearchModal';
import type { TableColumn } from '@/types';

export default function SupplementCornersPage() {
  // 검색 조건
  const [filters, setFilters] = useState({
    corner_name: '',
    is_active: '' as '' | 'true' | 'false',
  });
  const [searchFilters, setSearchFilters] = useState({ ...filters });
  const [page, setPage] = useState(1);
  const [selectedCornerId, setSelectedCornerId] = useState<number | null>(null);
  const [productPage, setProductPage] = useState(1);

  // 데이터 조회
  const { corners, pagination, isLoading, mutate: mutateCorners } = useSupplementCorners(
    searchFilters.corner_name || undefined,
    searchFilters.is_active === '' ? undefined : searchFilters.is_active === 'true',
    page,
    10
  );

  const { products, pagination: productPagination, isLoading: isProductLoading, mutate: mutateProducts } = useCornerProducts(
    selectedCornerId,
    productPage,
    10
  );

  // 뮤테이션
  const { updateCorner } = useUpdateCorner();
  const { deleteCorner, isDeleting: isCornerDeleting } = useDeleteCorner();
  const { deleteProduct, isDeleting: isProductDeleting } = useDeleteCornerProduct(selectedCornerId);

  // 모달 상태
  const [isCornerFormOpen, setIsCornerFormOpen] = useState(false);
  const [editingCorner, setEditingCorner] = useState<SupplementCorner | null>(null);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // 검색
  const handleSearch = () => {
    setSearchFilters({ ...filters });
    setPage(1);
  };

  // 초기화
  const handleReset = () => {
    setFilters({ corner_name: '', is_active: '' });
    setSearchFilters({ corner_name: '', is_active: '' });
    setPage(1);
    setSelectedCornerId(null);
  };

  // 코너 등록 모달 열기
  const handleOpenCornerForm = (corner?: SupplementCorner) => {
    setEditingCorner(corner || null);
    setIsCornerFormOpen(true);
  };

  // 코너 저장 완료
  const handleCornerSaved = () => {
    setIsCornerFormOpen(false);
    setEditingCorner(null);
    mutateCorners();
  };

  // 코너 삭제
  const handleDeleteCorner = (corner: SupplementCorner) => {
    setConfirmModal({
      isOpen: true,
      message: `'${corner.corner_name}' 코너를 삭제하시겠습니까?\n연결된 영양제도 모두 해제됩니다.`,
      onConfirm: async () => {
        try {
          await deleteCorner(corner.id);
          if (selectedCornerId === corner.id) {
            setSelectedCornerId(null);
          }
          mutateCorners();
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        } catch {
          setAlertMessage('삭제 중 오류가 발생했습니다.');
        }
      }
    });
  };

  // 코너 선택
  const handleSelectCorner = (corner: SupplementCorner) => {
    setSelectedCornerId(corner.id);
    setProductPage(1);
  };

  // 노출여부 토글
  const handleToggleActive = async (corner: SupplementCorner) => {
    try {
      await updateCorner(corner.id, { is_active: !corner.is_active });
      mutateCorners();
    } catch {
      setAlertMessage('변경 중 오류가 발생했습니다.');
    }
  };

  // 영양제 추가 모달 열기
  const handleOpenProductSearch = () => {
    if (!selectedCornerId) {
      setAlertMessage('코너를 먼저 선택해주세요.');
      return;
    }
    setIsProductSearchOpen(true);
  };

  // 영양제 추가 완료
  const handleProductSaved = () => {
    setIsProductSearchOpen(false);
    mutateProducts();
  };

  // 영양제 삭제
  const handleDeleteProduct = (product: CornerProduct) => {
    setConfirmModal({
      isOpen: true,
      message: `'${product.product_name}' 영양제를 이 코너에서 제거하시겠습니까?`,
      onConfirm: async () => {
        try {
          await deleteProduct(product.id);
          mutateProducts();
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        } catch {
          setAlertMessage('삭제 중 오류가 발생했습니다.');
        }
      }
    });
  };

  const selectedCorner = corners?.find(c => c.id === selectedCornerId);
  const existingProductIds = products?.map(p => p.product_id) || [];

  // 코너 테이블 컬럼
  const cornerColumns: TableColumn<SupplementCorner>[] = [
    {
      key: 'id',
      label: 'No.',
      width: 60,
      render: (_, __, index) => {
        const no = (pagination?.total || 0) - ((page - 1) * 10) - (index || 0);
        return <span className="text-gray-600">{no}</span>;
      },
    },
    {
      key: 'corner_name',
      label: '코너명',
      sortable: true,
      render: (value, row) => (
        <button
          onClick={() => handleSelectCorner(row)}
          className={`text-left hover:underline ${selectedCornerId === row.id ? 'text-[#4F46E5] font-semibold' : ''}`}
        >
          {(value as string) || '-'}
        </button>
      ),
    },
    {
      key: 'description',
      label: '설명',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'display_order',
      label: '노출순위',
      width: 80,
      sortable: true,
      render: (value) => (value as number) || 999,
    },
    {
      key: 'is_active',
      label: '노출여부',
      width: 80,
      render: (value, row) => (
        <button
          onClick={() => handleToggleActive(row)}
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {value ? 'Y' : 'N'}
        </button>
      ),
    },
    {
      key: 'created_at',
      label: '등록일',
      width: 100,
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('ko-KR');
      },
    },
    {
      key: 'actions',
      label: '관리',
      width: 120,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => handleOpenCornerForm(row)}
          >
            수정
          </Button>
          <Button 
            variant="danger" 
            size="sm"
            onClick={() => handleDeleteCorner(row)}
            disabled={isCornerDeleting}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  // 영양제 테이블 컬럼
  const productColumns: TableColumn<CornerProduct>[] = [
    {
      key: 'id',
      label: 'No.',
      width: 60,
      render: (_, __, index) => {
        const no = (productPagination?.total || 0) - ((productPage - 1) * 10) - (index || 0);
        return <span className="text-gray-600">{no}</span>;
      },
    },
    {
      key: 'product_id',
      label: '영양제ID',
      width: 120,
      render: (value) => {
        const id = (value as string) || '-';
        return <span className="text-xs font-mono truncate" title={id}>{id.slice(0, 8)}...</span>;
      },
    },
    {
      key: 'product_name',
      label: '영양제명',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'brand_name',
      label: '브랜드명',
      width: 100,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'interest_tags',
      label: '관심사 태그',
      width: 120,
      render: (value) => {
        const tags = value as string[];
        return tags?.length > 0 ? tags.join(', ') : '-';
      },
    },
    {
      key: 'display_order',
      label: '노출순위',
      width: 80,
      sortable: true,
      render: (value) => (value as number) || 999,
    },
    {
      key: 'actions',
      label: '관리',
      width: 80,
      render: (_, row) => (
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => handleDeleteProduct(row)}
          disabled={isProductDeleting}
        >
          삭제
        </Button>
      ),
    },
  ];

  const inputClass = 'h-[30px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]';
  const selectClass = 'h-[30px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-[22px] font-bold text-[#333]">영양제 코너 관리</h1>
          <p className="text-[13px] text-gray-500 mt-1">앱 내 영양제 코너를 관리합니다.</p>
        </div>

        {/* 검색 필터 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={labelClass}>코너명</span>
              <input
                type="text"
                value={filters.corner_name}
                onChange={(e) => setFilters(prev => ({ ...prev, corner_name: e.target.value }))}
                className={`${inputClass} w-[180px]`}
                placeholder="코너명"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>노출여부</span>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value as '' | 'true' | 'false' }))}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">전체</option>
                <option value="true">Y</option>
                <option value="false">N</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" onClick={handleReset}>
                초기화
              </Button>
              <Button onClick={handleSearch}>
                검색
              </Button>
            </div>
          </div>
        </div>

        {/* 코너 목록 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#333]">코너 목록</h3>
            <Button size="sm" onClick={() => handleOpenCornerForm()}>
              코너 등록
            </Button>
          </div>
          
          <DataTable
            columns={cornerColumns}
            data={corners || []}
            totalCount={pagination?.total}
            isLoading={isLoading}
            emptyMessage="등록된 코너가 없습니다."
            getRowKey={(row) => String(row.id)}
            onRowClick={handleSelectCorner}
            selectedRowId={selectedCornerId ? String(selectedCornerId) : undefined}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* 영양제 목록 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#333]">
              영양제 목록
              {selectedCorner && (
                <span className="ml-2 text-[13px] font-normal text-gray-500">
                  ({selectedCorner.corner_name})
                </span>
              )}
            </h3>
            <Button 
              size="sm" 
              onClick={handleOpenProductSearch}
              disabled={!selectedCornerId}
            >
              영양제 등록
            </Button>
          </div>
          
          {!selectedCornerId ? (
            <div className="p-8 text-center text-gray-500 text-[14px]">
              위 목록에서 코너를 선택하면 해당 코너의 영양제 목록이 표시됩니다.
            </div>
          ) : (
            <>
              <DataTable
                columns={productColumns}
                data={products || []}
                totalCount={productPagination?.total}
                isLoading={isProductLoading}
                emptyMessage="등록된 영양제가 없습니다."
                getRowKey={(row) => row.id}
              />

              {productPagination && productPagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <Pagination
                    currentPage={productPage}
                    totalPages={productPagination.totalPages}
                    onPageChange={setProductPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 모달 */}
        <CornerFormModal
          corner={editingCorner}
          isOpen={isCornerFormOpen}
          onClose={() => {
            setIsCornerFormOpen(false);
            setEditingCorner(null);
          }}
          onSaved={handleCornerSaved}
        />

        <ProductSearchModal
          cornerId={selectedCornerId}
          isOpen={isProductSearchOpen}
          onClose={() => setIsProductSearchOpen(false)}
          onSaved={handleProductSaved}
          existingProductIds={existingProductIds}
        />

        <AlertModal
          isOpen={!!alertMessage}
          onClose={() => setAlertMessage(null)}
          message={alertMessage || ''}
        />

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
          onConfirm={confirmModal.onConfirm}
          message={confirmModal.message}
        />
      </div>
    </AdminLayout>
  );
}
