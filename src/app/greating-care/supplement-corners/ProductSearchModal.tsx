'use client';

// ============================================
// 영양제 검색/추가 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, AlertModal, DataTable, Pagination } from '@/components/common';
import { Button } from '@/components/common';
import { 
  useSearchProducts, 
  useAddCornerProducts, 
  type SearchProduct 
} from '@/hooks/useSupplementCorners';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TableColumn } from '@/types';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

interface ProductSearchModalProps {
  cornerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingProductIds: string[];
}

// 관심사 태그 목록 조회
interface InterestTag {
  id: number;
  category_name: string;
}

export function ProductSearchModal({ cornerId, isOpen, onClose, onSaved, existingProductIds }: ProductSearchModalProps) {
  // 검색 조건
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');
  const [interestTag, setInterestTag] = useState('');
  const [page, setPage] = useState(1);
  
  // 선택된 영양제
  const [selectedProducts, setSelectedProducts] = useState<SearchProduct[]>([]);
  const [checkedSearchIds, setCheckedSearchIds] = useState<string[]>([]);
  const [checkedSelectedIds, setCheckedSelectedIds] = useState<string[]>([]);
  
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 관심사 태그 목록 조회
  const { data: interestTagsData } = useSWR<{ success: boolean; data: InterestTag[] }>(
    '/admin/content-categories?category_type=interest',
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const interestTags = interestTagsData?.data || [];

  // 영양제 검색
  const { products, pagination, isLoading } = useSearchProducts(
    productName || undefined,
    productId || undefined,
    interestTag || undefined,
    page,
    10
  );

  // 추가 뮤테이션
  const { addProducts, isAdding } = useAddCornerProducts(cornerId);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setProductName('');
      setProductId('');
      setInterestTag('');
      setPage(1);
      setSelectedProducts([]);
      setCheckedSearchIds([]);
      setCheckedSelectedIds([]);
    }
  }, [isOpen]);

  // 이미 매핑되어 있거나 선택된 상품 필터링
  const filteredSearchResults = products.filter(
    p => !existingProductIds.includes(p.product_id) && !selectedProducts.find(s => s.product_id === p.product_id)
  );

  // 검색 결과 → 선택 목록으로 추가
  const handleAddToSelected = () => {
    const toAdd = products.filter(p => checkedSearchIds.includes(p.product_id));
    setSelectedProducts(prev => [...prev, ...toAdd]);
    setCheckedSearchIds([]);
  };

  // 선택 목록에서 제거
  const handleRemoveFromSelected = () => {
    setSelectedProducts(prev => prev.filter(p => !checkedSelectedIds.includes(p.product_id)));
    setCheckedSelectedIds([]);
  };

  // 저장
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setAlertMessage('추가할 영양제를 선택해주세요.');
      return;
    }

    try {
      await addProducts(selectedProducts.map((p, idx) => ({
        product_id: p.product_id,
        display_order: 999 + idx
      })));
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 검색 결과 테이블 컬럼
  const searchColumns: TableColumn<SearchProduct>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={checkedSearchIds.includes(row.product_id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setCheckedSearchIds(prev => [...prev, row.product_id]);
            } else {
              setCheckedSearchIds(prev => prev.filter(id => id !== row.product_id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'product_id',
      label: 'ID',
      width: 80,
      render: (value) => {
        const id = (value as string) || '-';
        return <span className="truncate block max-w-[80px]" title={id}>{id.slice(0, 8)}...</span>;
      },
    },
    {
      key: 'product_name',
      label: '영양제명',
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="truncate block max-w-[120px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'interest_tags',
      label: '관심사 태그',
      render: (value) => {
        const tags = value as string[];
        const text = tags?.length > 0 ? tags.join(', ') : '-';
        return <span className="truncate block max-w-[100px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'brand_name',
      label: '브랜드명',
      width: 80,
      render: (value) => (value as string) || '-',
    },
  ];

  // 선택 목록 테이블 컬럼
  const selectedColumns: TableColumn<SearchProduct>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={checkedSelectedIds.includes(row.product_id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setCheckedSelectedIds(prev => [...prev, row.product_id]);
            } else {
              setCheckedSelectedIds(prev => prev.filter(id => id !== row.product_id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'product_id',
      label: 'ID',
      width: 80,
      render: (value) => {
        const id = (value as string) || '-';
        return <span className="truncate block max-w-[80px]" title={id}>{id.slice(0, 8)}...</span>;
      },
    },
    {
      key: 'product_name',
      label: '영양제명',
      render: (value) => {
        const text = (value as string) || '-';
        return <span className="truncate block max-w-[120px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'interest_tags',
      label: '관심사 태그',
      render: (value) => {
        const tags = value as string[];
        const text = tags?.length > 0 ? tags.join(', ') : '-';
        return <span className="truncate block max-w-[100px]" title={text}>{text}</span>;
      },
    },
    {
      key: 'brand_name',
      label: '브랜드명',
      width: 80,
      render: (value) => (value as string) || '-',
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="영양제 등록"
        size="lg"
      >
        <div className="p-4 space-y-4">
          {/* 검색 영역 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={labelClass}>영양제명</span>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={`${inputClass} w-[140px]`}
                  placeholder="영양제명"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={labelClass}>영양제ID</span>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className={`${inputClass} w-[120px]`}
                  placeholder="ID"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={labelClass}>관심사 태그</span>
                <select
                  value={interestTag}
                  onChange={(e) => setInterestTag(e.target.value)}
                  className={`${selectClass} w-[140px]`}
                >
                  <option value="">전체</option>
                  {interestTags.map(tag => (
                    <option key={tag.id} value={tag.category_name}>{tag.category_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 검색 결과 */}
          <div>
            <DataTable
              columns={searchColumns}
              data={filteredSearchResults}
              totalCount={pagination?.total}
              isLoading={isLoading}
              emptyMessage="검색 결과가 없습니다."
              getRowKey={(row) => row.product_id}
              title="검색 결과"
              maxHeight="200px"
            />
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </div>

          {/* 추가/삭제 버튼 */}
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddToSelected}
              disabled={checkedSearchIds.length === 0}
              className="flex items-center gap-1"
            >
              <ChevronDown className="w-4 h-4" />
              추가
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRemoveFromSelected}
              disabled={checkedSelectedIds.length === 0}
              className="flex items-center gap-1"
            >
              <ChevronUp className="w-4 h-4" />
              삭제
            </Button>
          </div>

          {/* 선택 목록 */}
          <div>
            <DataTable
              columns={selectedColumns}
              data={selectedProducts}
              totalCount={selectedProducts.length}
              isLoading={false}
              emptyMessage="선택된 영양제가 없습니다."
              getRowKey={(row) => row.product_id}
              title="선택 목록"
              maxHeight="200px"
            />
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={onClose} disabled={isAdding}>
            취소하기
          </Button>
          <Button onClick={handleSubmit} disabled={isAdding || selectedProducts.length === 0}>
            {isAdding ? '저장 중...' : '저장'}
          </Button>
        </div>
      </Modal>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

