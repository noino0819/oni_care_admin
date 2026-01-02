'use client';

// ============================================
// 공지사항 관리 페이지 - 기획서 스펙 반영
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal } from '@/components/common';
import { NoticeFormModal } from './NoticeFormModal';
import { useNotices } from '@/hooks/useNotices';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus } from 'lucide-react';
import type { NoticeSearchFilters, SortConfig, TableColumn, NoticeListItem } from '@/types';

// 공개범위 옵션
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

// 상태 옵션
const STATUS_OPTIONS = [
  { value: 'before', label: '게시 전' },
  { value: 'active', label: '게시 중' },
  { value: 'ended', label: '게시 종료' },
];

export default function NoticesPage() {
  const [filters, setFilters] = useState<NoticeSearchFilters>({
    title: '',
    status: [],
    visibility_scope: [],
    company_code: '',
    created_from: '',
    created_to: '',
  });

  const [sort, setSort] = useState<SortConfig>({
    field: 'created_at',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { notices, pagination, isLoading, refetch, deleteNotices } = useNotices(
    filters,
    sort,
    page,
    20
  );

  const handleFilterChange = (key: keyof NoticeSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      title: '',
      status: [],
      visibility_scope: [],
      company_code: '',
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

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteNotices(selectedIds);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const getStatusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt?.label || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'before': return 'bg-yellow-100 text-yellow-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'ended': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const columns: TableColumn<NoticeListItem>[] = [
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
      label: '공지사항 제목',
      sortable: true,
    },
    {
      key: 'visibility_scope',
      label: '노출범위',
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
      key: 'company_codes',
      label: '기업/사업장코드',
      render: (value) => {
        const codes = value as string[];
        return codes?.length > 0 ? codes.join(', ') : '-';
      },
    },
    {
      key: 'start_date',
      label: '게시기간',
      render: (_, row) => {
        if (!row.start_date && !row.end_date) return '-';
        return `${formatDate(row.start_date || '')}~${formatDate(row.end_date || '')}`;
      },
    },
    {
      key: 'status',
      label: '상태',
      align: 'center',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(value as string)}`}>
          {getStatusLabel(value as string)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: '등록일',
      sortable: true,
      render: (value) => formatDate(value as string),
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">공지사항 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 공지사항 관리
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
                className={`${inputClass} w-[200px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>상태</span>
              <div className="flex items-center gap-3">
                {STATUS_OPTIONS.map(option => (
                  <label key={option.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(option.value) || false}
                      onChange={(e) => {
                        const current = filters.status || [];
                        if (e.target.checked) {
                          handleFilterChange('status', [...current, option.value]);
                        } else {
                          handleFilterChange('status', current.filter(v => v !== option.value));
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
              <span className={labelClass}>기업/사업장코드</span>
              <input
                type="text"
                value={filters.company_code}
                onChange={(e) => handleFilterChange('company_code', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>등록일</span>
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
            data={notices}
            totalCount={pagination?.total}
            sorting={sort}
            onSort={handleSort}
            onRowClick={(row) => setEditingId(row.id)}
            isLoading={isLoading}
            emptyMessage="조회 결과가 없습니다."
            getRowKey={(row) => row.id}
            title="공지사항 리스트"
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

      {/* 공지사항 등록/수정 모달 */}
      <NoticeFormModal
        noticeId={editingId}
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
        message={`선택한 ${selectedIds.length}개 공지사항을 삭제하시겠습니까?`}
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


