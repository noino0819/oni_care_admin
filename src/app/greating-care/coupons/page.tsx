'use client';

// ============================================
// 쿠폰 관리 페이지
// ============================================

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { DataTable, Pagination, AlertModal, ConfirmModal, Button } from '@/components/common';
import { useCoupons, useDeleteCoupon, type Coupon } from '@/hooks/useCoupons';
import type { TableColumn } from '@/types';

// 발급처 한글화
const issueSourceLabel: Record<string, string> = {
  greating: '그리팅',
  cafeteria: '카페테리아',
};

// ID 마스킹
function maskId(id: string): string {
  if (!id || id.length < 4) return '***';
  return id.slice(0, 4) + '****';
}

// 고객명 마스킹
function maskName(name: string): string {
  if (!name || name.length < 2) return '*';
  return name[0] + '*'.repeat(name.length - 1);
}

// 금액 포맷
function formatCurrency(value: number): string {
  return value.toLocaleString() + '원';
}

export default function CouponsPage() {
  // 검색 조건
  const [filters, setFilters] = useState({
    user_id: '',
    user_name: '',
    coupon_name: '',
    issue_source: '' as '' | 'greating' | 'cafeteria',
    issued_at_from: '',
    issued_at_to: '',
  });
  const [searchFilters, setSearchFilters] = useState({ ...filters });
  const [page, setPage] = useState(1);

  // 데이터 조회
  const { coupons, pagination, isLoading, mutate } = useCoupons({
    user_id: searchFilters.user_id || undefined,
    user_name: searchFilters.user_name || undefined,
    coupon_name: searchFilters.coupon_name || undefined,
    issue_source: searchFilters.issue_source || undefined,
    issued_at_from: searchFilters.issued_at_from || undefined,
    issued_at_to: searchFilters.issued_at_to || undefined,
    page,
    limit: 10,
  });

  // 뮤테이션
  const { deleteCoupon, isDeleting } = useDeleteCoupon();

  // 모달 상태
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
    const initialFilters = {
      user_id: '',
      user_name: '',
      coupon_name: '',
      issue_source: '' as '' | 'greating' | 'cafeteria',
      issued_at_from: '',
      issued_at_to: '',
    };
    setFilters(initialFilters);
    setSearchFilters(initialFilters);
    setPage(1);
  };

  // 삭제
  const handleDelete = (coupon: Coupon) => {
    setConfirmModal({
      isOpen: true,
      message: `선택한 쿠폰을 삭제하시겠습니까?\n(${coupon.coupon_name} - ${formatCurrency(coupon.coupon_value)})`,
      onConfirm: async () => {
        try {
          await deleteCoupon(coupon.id);
          mutate();
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        } catch {
          setAlertMessage('삭제 중 오류가 발생했습니다.');
        }
      }
    });
  };

  // 테이블 컬럼
  const columns: TableColumn<Coupon>[] = [
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
      key: 'user_id',
      label: 'ID',
      width: 100,
      render: (value) => maskId(String(value || '').slice(0, 8)),
    },
    {
      key: 'user_name',
      label: '고객명',
      width: 80,
      render: (value) => maskName((value as string) || ''),
    },
    {
      key: 'coupon_name',
      label: '쿠폰명',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'coupon_value',
      label: '쿠폰금액',
      width: 100,
      sortable: true,
      render: (value) => {
        const amount = value as number;
        return <span className="font-medium text-[#4F46E5]">{formatCurrency(amount || 0)}</span>;
      },
    },
    {
      key: 'issue_source',
      label: '발급처',
      width: 100,
      render: (value) => {
        const strValue = value as string;
        const label = issueSourceLabel[strValue] || strValue || '-';
        const isGreating = strValue === 'greating';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isGreating ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'issued_at',
      label: '발급일시',
      width: 140,
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value as string).toLocaleString('ko-KR');
      },
    },
    {
      key: 'created_at',
      label: '등록일시',
      width: 140,
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value as string).toLocaleString('ko-KR');
      },
    },
    {
      key: 'actions',
      label: '관리',
      width: 80,
      render: (_, row) => (
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => handleDelete(row)}
          disabled={isDeleting}
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
          <h1 className="text-[22px] font-bold text-[#333]">쿠폰 관리</h1>
          <p className="text-[13px] text-gray-500 mt-1">회원들의 쿠폰 내역을 관리합니다.</p>
        </div>

        {/* 검색 필터 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={labelClass}>ID</span>
              <input
                type="text"
                value={filters.user_id}
                onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
                className={`${inputClass} w-[120px]`}
                placeholder="사용자 ID"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>고객명</span>
              <input
                type="text"
                value={filters.user_name}
                onChange={(e) => setFilters(prev => ({ ...prev, user_name: e.target.value }))}
                className={`${inputClass} w-[100px]`}
                placeholder="고객명"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>쿠폰명</span>
              <input
                type="text"
                value={filters.coupon_name}
                onChange={(e) => setFilters(prev => ({ ...prev, coupon_name: e.target.value }))}
                className={`${inputClass} w-[140px]`}
                placeholder="쿠폰명"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>발급처</span>
              <select
                value={filters.issue_source}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  issue_source: e.target.value as '' | 'greating' | 'cafeteria'
                }))}
                className={`${selectClass} w-[110px]`}
              >
                <option value="">전체</option>
                <option value="greating">그리팅</option>
                <option value="cafeteria">카페테리아</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>발급일시</span>
              <input
                type="date"
                value={filters.issued_at_from}
                onChange={(e) => setFilters(prev => ({ ...prev, issued_at_from: e.target.value }))}
                className={`${inputClass} w-[130px]`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={filters.issued_at_to}
                onChange={(e) => setFilters(prev => ({ ...prev, issued_at_to: e.target.value }))}
                className={`${inputClass} w-[130px]`}
              />
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

        {/* 쿠폰 목록 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#333]">
                쿠폰 목록
                {pagination && (
                  <span className="ml-2 text-[13px] font-normal text-gray-500">
                    (총 {pagination.total.toLocaleString()}건)
                  </span>
                )}
              </h3>
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={coupons || []}
            totalCount={pagination?.total}
            isLoading={isLoading}
            emptyMessage="조회된 쿠폰이 없습니다."
            getRowKey={(row) => row.id}
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

        {/* 모달 */}
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
