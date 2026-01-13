'use client';

// ============================================
// 식사기록 관리 페이지
// ============================================

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { DataTable, Pagination, AlertModal, ConfirmModal, Button } from '@/components/common';
import { useMealRecords, useDeleteMealRecord, type MealRecord } from '@/hooks/useMealRecords';
import type { TableColumn } from '@/types';

// 끼니 구분 한글화
const mealTypeLabel: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

// 기록구분 한글화
const recordSourceLabel: Record<string, string> = {
  greating_care: '그리팅 케어',
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

export default function MealRecordsPage() {
  // 검색 조건
  const [filters, setFilters] = useState({
    user_id: '',
    user_name: '',
    record_date_from: '',
    record_date_to: '',
    meal_type: '' as '' | 'breakfast' | 'lunch' | 'dinner' | 'snack',
    record_source: '' as '' | 'greating_care' | 'cafeteria',
  });
  const [searchFilters, setSearchFilters] = useState({ ...filters });
  const [page, setPage] = useState(1);

  // 데이터 조회
  const { records, pagination, isLoading, mutate } = useMealRecords({
    user_id: searchFilters.user_id || undefined,
    user_name: searchFilters.user_name || undefined,
    record_date_from: searchFilters.record_date_from || undefined,
    record_date_to: searchFilters.record_date_to || undefined,
    meal_type: searchFilters.meal_type || undefined,
    record_source: searchFilters.record_source || undefined,
    page,
    limit: 10,
  });

  // 뮤테이션
  const { deleteRecord, isDeleting } = useDeleteMealRecord();

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
      record_date_from: '',
      record_date_to: '',
      meal_type: '' as '' | 'breakfast' | 'lunch' | 'dinner' | 'snack',
      record_source: '' as '' | 'greating_care' | 'cafeteria',
    };
    setFilters(initialFilters);
    setSearchFilters(initialFilters);
    setPage(1);
  };

  // 삭제
  const handleDelete = (record: MealRecord) => {
    setConfirmModal({
      isOpen: true,
      message: `선택한 식사기록을 삭제하시겠습니까?\n(${record.food_name})`,
      onConfirm: async () => {
        try {
          await deleteRecord(record.id);
          mutate();
          setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        } catch {
          setAlertMessage('삭제 중 오류가 발생했습니다.');
        }
      }
    });
  };

  // 테이블 컬럼
  const columns: TableColumn<MealRecord>[] = [
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
      key: 'record_date',
      label: '기록일자',
      width: 100,
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('ko-KR');
      },
    },
    {
      key: 'meal_type',
      label: '끼니구분',
      width: 80,
      render: (value) => mealTypeLabel[value as string] || value || '-',
    },
    {
      key: 'food_name',
      label: '메뉴명',
      render: (value) => (value as string) || '-',
    },
    {
      key: 'serving_size',
      label: '섭취량',
      width: 80,
      render: (value) => value ? `${value}` : '-',
    },
    {
      key: 'calories',
      label: '칼로리',
      width: 80,
      render: (value) => value ? `${value}kcal` : '-',
    },
    {
      key: 'record_source',
      label: '기록구분',
      width: 100,
      render: (value) => {
        const label = recordSourceLabel[value as string] || value || '-';
        const isGreating = value === 'greating_care';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isGreating ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {label}
          </span>
        );
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
          <h1 className="text-[22px] font-bold text-[#333]">식사기록 관리</h1>
          <p className="text-[13px] text-gray-500 mt-1">회원들의 식사기록을 관리합니다.</p>
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
              <span className={labelClass}>기록일자</span>
              <input
                type="date"
                value={filters.record_date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, record_date_from: e.target.value }))}
                className={`${inputClass} w-[130px]`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={filters.record_date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, record_date_to: e.target.value }))}
                className={`${inputClass} w-[130px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>끼니구분</span>
              <select
                value={filters.meal_type}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  meal_type: e.target.value as '' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
                }))}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">전체</option>
                <option value="breakfast">아침</option>
                <option value="lunch">점심</option>
                <option value="dinner">저녁</option>
                <option value="snack">간식</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기록구분</span>
              <select
                value={filters.record_source}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  record_source: e.target.value as '' | 'greating_care' | 'cafeteria'
                }))}
                className={`${selectClass} w-[120px]`}
              >
                <option value="">전체</option>
                <option value="greating_care">그리팅 케어</option>
                <option value="cafeteria">카페테리아</option>
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

        {/* 식사기록 목록 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#333]">
                식사기록 목록
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
            data={records || []}
            totalCount={pagination?.total}
            isLoading={isLoading}
            emptyMessage="조회된 식사기록이 없습니다."
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
