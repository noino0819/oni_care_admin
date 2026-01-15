'use client';

// ============================================
// 1:1 문의 관리 페이지
// ============================================

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, DatePicker } from '@/components/common';
import { InquiryAnswerModal } from './InquiryAnswerModal';
import { useInquiries, useInquiryTypes, type Inquiry, type InquirySearchFilters } from '@/hooks/useInquiries';
import { formatDate } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import type { TableColumn } from '@/types';

// 처리상태 Badge 컴포넌트
const StatusBadge = ({ status }: { status: string }) => {
  const isAnswered = status === 'answered';
  return (
    <span className={`text-[12px] ${isAnswered ? 'text-gray-500' : 'text-orange-500 font-semibold'}`}>
      {isAnswered ? '답변 완료' : '미답변'}
    </span>
  );
};

export default function InquiriesPage() {
  const [filters, setFilters] = useState<InquirySearchFilters>({
    customer_id: '',
    customer_name: '',
    inquiry_type_id: null,
    content: '',
    status: [],
    created_from: '',
    created_to: '',
    answered_from: '',
    answered_to: '',
    answered_by: '',
  });

  const [page, setPage] = useState(1);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  const { inquiries, pagination, isLoading, refetch } = useInquiries(
    filters,
    page,
    20
  );

  const { types: inquiryTypes } = useInquiryTypes();

  const handleFilterChange = (key: keyof InquirySearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      customer_id: '',
      customer_name: '',
      inquiry_type_id: null,
      content: '',
      status: [],
      created_from: '',
      created_to: '',
      answered_from: '',
      answered_to: '',
      answered_by: '',
    });
    setPage(1);
    refetch();
  };

  const columns: TableColumn<Inquiry>[] = [
    {
      key: 'customer_id_masked',
      label: '고객 ID',
      width: 100,
      render: (value) => value as string || '-',
    },
    {
      key: 'customer_name_display',
      label: '고객명',
      width: 80,
      render: (value) => value as string || '-',
    },
    {
      key: 'inquiry_type_name',
      label: '문의 유형',
      width: 130,
      render: (value) => value as string || '-',
    },
    {
      key: 'content',
      label: '문의 내용',
      render: (value) => {
        const content = value as string;
        // 50자 이상이면 잘라서 표시
        return content?.length > 50 ? content.substring(0, 50) + '...' : content || '-';
      },
    },
    {
      key: 'created_at',
      label: '등록일',
      width: 160,
      render: (value) => formatDate(value as string, 'YYYY.MM.DD HH:mm:ss'),
    },
    {
      key: 'status',
      label: '처리상태',
      width: 80,
      render: (value) => <StatusBadge status={value as string} />,
    },
    {
      key: 'answered_at',
      label: '답변일',
      width: 160,
      render: (value) => value ? formatDate(value as string, 'YYYY.MM.DD HH:mm:ss') : '-',
    },
    {
      key: 'answered_by',
      label: '답변자',
      width: 100,
      render: (value) => value as string || '-',
    },
  ];

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  // 스켈레톤 로딩 UI
  const renderSkeletonRows = () => (
    Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        {columns.map((col, colIdx) => (
          <td key={colIdx} className="px-3 py-2">
            <div className="h-4 bg-gray-200 rounded" style={{ width: typeof col.width === 'number' ? col.width - 20 : '100%' }}></div>
          </td>
        ))}
      </tr>
    ))
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">1:1 문의 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅 케어 &gt; 문의 내역 관리 &gt; 1:1 문의 관리
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
              <span className={labelClass}>고객 ID</span>
              <input
                type="text"
                value={filters.customer_id || ''}
                onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>고객명</span>
              <input
                type="text"
                value={filters.customer_name || ''}
                onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>등록일</span>
              <DatePicker
                value={filters.created_from ? new Date(filters.created_from) : null}
                onChange={(date) => handleFilterChange('created_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.created_to ? new Date(filters.created_to) : null}
                onChange={(date) => handleFilterChange('created_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>처리상태</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes('answered') || false}
                    onChange={(e) => {
                      const current = filters.status || [];
                      if (e.target.checked) {
                        handleFilterChange('status', [...current, 'answered']);
                      } else {
                        handleFilterChange('status', current.filter(v => v !== 'answered'));
                      }
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">답변완료</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes('pending') || false}
                    onChange={(e) => {
                      const current = filters.status || [];
                      if (e.target.checked) {
                        handleFilterChange('status', [...current, 'pending']);
                      } else {
                        handleFilterChange('status', current.filter(v => v !== 'pending'));
                      }
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">미답변</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>문의 유형</span>
              <select
                value={filters.inquiry_type_id || ''}
                onChange={(e) => handleFilterChange('inquiry_type_id', e.target.value ? Number(e.target.value) : null)}
                className={`${selectClass} w-[160px]`}
              >
                <option value="">전체</option>
                {inquiryTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>문의 내용</span>
              <input
                type="text"
                value={filters.content || ''}
                onChange={(e) => handleFilterChange('content', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>답변일</span>
              <DatePicker
                value={filters.answered_from ? new Date(filters.answered_from) : null}
                onChange={(date) => handleFilterChange('answered_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.answered_to ? new Date(filters.answered_to) : null}
                onChange={(date) => handleFilterChange('answered_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder=""
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>답변자</span>
              <input
                type="text"
                value={filters.answered_by || ''}
                onChange={(e) => handleFilterChange('answered_by', e.target.value)}
                placeholder=""
                className={`${inputClass} w-[120px]`}
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="relative">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-[14px] font-bold text-black">1:1 문의 관리</h2>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-[#F5F5DC]">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-semibold text-[#333]" style={{ width: col.width }}>
                        {typeof col.label === 'function' ? col.label() : col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderSkeletonRows()}</tbody>
              </table>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={inquiries}
              totalCount={pagination?.total}
              onRowClick={(row) => setSelectedInquiryId(row.id)}
              isLoading={isLoading}
              emptyMessage="조회 결과가 없습니다."
              getRowKey={(row) => row.id}
              title="1:1 문의 관리"
            />
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* 1:1 문의 답변 모달 */}
      <InquiryAnswerModal
        inquiryId={selectedInquiryId}
        isOpen={!!selectedInquiryId}
        onClose={() => setSelectedInquiryId(null)}
        onSaved={() => {
          refetch();
          setSelectedInquiryId(null);
        }}
      />
    </AdminLayout>
  );
}

