'use client';

// ============================================
// 포인트 관리 페이지 - 기획서 스펙 반영
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, AlertModal, ConfirmModal } from '@/components/common';
import { PointDetailModal } from './PointDetailModal';
import { PointAdjustModal } from './PointAdjustModal';
import { usePoints, revokePointTransaction } from '@/hooks/usePoints';
import { formatDate, maskName, maskEmail } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import type { PointSearchFilters, SortConfig, TableColumn, PointHistoryItem } from '@/types';

// 회원구분 옵션
const MEMBER_TYPE_OPTIONS = [
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

// 포인트 유형 옵션
const POINT_TYPE_OPTIONS = [
  { value: 'earn', label: '적립' },
  { value: 'use', label: '사용' },
  { value: 'transfer', label: '이관' },
  { value: 'expire', label: '소멸' },
];

export default function PointsPage() {
  const [filters, setFilters] = useState<PointSearchFilters>({
    name: '',
    id: '',
    member_types: [],
    business_code: '',
    transaction_type: '',
    created_from: '',
    created_to: '',
  });

  const [sort, setSort] = useState<SortConfig>({
    field: 'created_at',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { pointHistory, pagination, isLoading, refetch } = usePoints(
    filters,
    sort,
    page,
    20
  );

  const handleFilterChange = (key: keyof PointSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      name: '',
      id: '',
      member_types: [],
      business_code: '',
      transaction_type: '',
      created_from: '',
      created_to: '',
    });
    setSort({ field: 'created_at', direction: 'desc' });
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

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokePointTransaction(revokeTarget);
      setRevokeTarget(null);
      refetch();
    } catch {
      setAlertMessage('취소 처리 중 오류가 발생했습니다.');
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const opt = POINT_TYPE_OPTIONS.find(o => o.value === type);
    return opt?.label || type;
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'earn': return 'text-green-600';
      case 'use': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      case 'expire': return 'text-gray-500';
      default: return '';
    }
  };

  const columns: TableColumn<PointHistoryItem>[] = [
    {
      key: 'email',
      label: 'ID',
      render: (value) => maskEmail(value as string),
    },
    {
      key: 'user_id',
      label: '고객명',
      render: (_, row) => maskName(row.email.split('@')[0] || ''),
    },
    {
      key: 'transaction_type',
      label: '유형',
      render: (value) => {
        const type = value as string;
        return (
          <span className={getTransactionTypeColor(type)}>
            {getTransactionTypeLabel(type)}
          </span>
        );
      },
    },
    {
      key: 'source',
      label: '적립/사용처',
    },
    {
      key: 'source_detail',
      label: '상세내역',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'points',
      label: '포인트',
      align: 'right',
      render: (value, row) => {
        const pts = value as number;
        const isPositive = row.transaction_type === 'earn';
        return (
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {isPositive ? '+' : ''}{pts.toLocaleString()}P
          </span>
        );
      },
    },
    {
      key: 'balance_after',
      label: '잔여포인트',
      align: 'right',
      render: (value) => `${(value as number).toLocaleString()}P`,
    },
    {
      key: 'created_at',
      label: '일시',
      sortable: true,
      render: (value) => formatDate(value as string, 'YYYY-MM-DD HH:mm'),
    },
    {
      key: 'is_revoked',
      label: '상태',
      align: 'center',
      render: (value) => (value as boolean) ? (
        <span className="text-gray-400">취소됨</span>
      ) : (
        <span className="text-green-600">정상</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 60,
      render: (_, row) => (
        !row.is_revoked && row.transaction_type === 'earn' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setRevokeTarget(row.id);
            }}
            className="text-xs px-2 py-1 text-red-500"
          >
            취소
          </Button>
        ) : null
      ),
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
            <h1 className="text-[18px] font-bold text-black">포인트 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 포인트 관리
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
              <span className={labelClass}>고객명</span>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>ID</span>
              <input
                type="text"
                value={filters.id}
                onChange={(e) => handleFilterChange('id', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>회원구분</span>
              <div className="flex items-center gap-3">
                {MEMBER_TYPE_OPTIONS.map(option => (
                  <label key={option.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.member_types?.includes(option.value) || false}
                      onChange={(e) => {
                        const current = filters.member_types || [];
                        if (e.target.checked) {
                          handleFilterChange('member_types', [...current, option.value]);
                        } else {
                          handleFilterChange('member_types', current.filter(v => v !== option.value));
                        }
                      }}
                      className={checkboxClass}
                    />
                    <span className="text-[13px] text-[#333]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>포인트유형</span>
              <select
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                className={`${selectClass} w-[120px]`}
              >
                <option value="">전체</option>
                {POINT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>기업/사업장코드</span>
              <input
                type="text"
                value={filters.business_code}
                onChange={(e) => handleFilterChange('business_code', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>거래일시</span>
              <input
                type="date"
                value={filters.created_from}
                onChange={(e) => handleFilterChange('created_from', e.target.value)}
                className={`${inputClass} w-[130px]`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={filters.created_to}
                onChange={(e) => handleFilterChange('created_to', e.target.value)}
                className={`${inputClass} w-[130px]`}
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
              onClick={() => setShowAdjustModal(true)}
            >
              포인트 조정
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={pointHistory}
            totalCount={pagination?.total}
            sorting={sort}
            onSort={handleSort}
            onRowClick={(row) => setSelectedId(row.id)}
            isLoading={isLoading}
            emptyMessage="조회 결과가 없습니다."
            getRowKey={(row) => row.id}
            title="포인트 내역"
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

      {/* 포인트 상세 모달 */}
      <PointDetailModal
        pointId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* 포인트 조정 모달 */}
      <PointAdjustModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        onSaved={() => {
          refetch();
          setShowAdjustModal(false);
        }}
      />

      {/* 취소 확인 모달 */}
      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        message="이 포인트 적립을 취소하시겠습니까? 취소 시 해당 포인트가 차감됩니다."
        cancelText="아니오"
        confirmText="취소"
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

