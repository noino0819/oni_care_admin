'use client';

// ============================================
// 챌린지 관리 페이지
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal, DatePicker } from '@/components/common';
import { ChallengeFormModal } from './ChallengeFormModal';
import { useChallenges, deleteChallenges, type Challenge, type ChallengeSearchFilters } from '@/hooks/useChallenges';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus } from 'lucide-react';
import type { TableColumn } from '@/types';

// 챌린지 유형 옵션
const CHALLENGE_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'attendance', label: '출석' },
  { value: 'steps', label: '걸음수' },
  { value: 'meal', label: '식단' },
  { value: 'supplement', label: '영양제' },
  { value: 'nutrition_diagnosis', label: '영양진단' },
  { value: 'health_habit', label: '건강습관' },
  { value: 'quiz', label: '퀴즈' },
];

// 인증 방식 옵션
const VERIFICATION_METHOD_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'roulette', label: '룰렛' },
  { value: 'auto', label: '자동' },
  { value: 'manual', label: '수동' },
];

// 공개범위 옵션
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

// 상태 옵션
const STATUS_OPTIONS = [
  { value: 'draft', label: '작성중' },
  { value: 'recruiting', label: '모집중' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'suspended', label: '일시중지' },
];

// 상태 표시 컴포넌트
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
    recruiting: { label: '모집중', className: 'bg-blue-100 text-blue-600' },
    in_progress: { label: '진행중', className: 'bg-green-100 text-green-600' },
    completed: { label: '완료', className: 'bg-gray-100 text-gray-500' },
    suspended: { label: '일시중지', className: 'bg-red-100 text-red-600' },
  };
  
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] ${config.className}`}>
      {config.label}
    </span>
  );
};

// 챌린지 유형 표시 컴포넌트
const TypeBadge = ({ type }: { type: string }) => {
  const typeConfig: Record<string, { label: string; className: string }> = {
    attendance: { label: '출석', className: 'bg-purple-100 text-purple-600' },
    steps: { label: '걸음수', className: 'bg-orange-100 text-orange-600' },
    meal: { label: '식단', className: 'bg-green-100 text-green-600' },
    supplement: { label: '영양제', className: 'bg-pink-100 text-pink-600' },
    nutrition_diagnosis: { label: '영양진단', className: 'bg-indigo-100 text-indigo-600' },
    health_habit: { label: '건강습관', className: 'bg-cyan-100 text-cyan-600' },
    quiz: { label: '퀴즈', className: 'bg-yellow-100 text-yellow-600' },
  };
  
  const config = typeConfig[type] || { label: type, className: 'bg-gray-100 text-gray-600' };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] ${config.className}`}>
      {config.label}
    </span>
  );
};

export default function ChallengesPage() {
  const [filters, setFilters] = useState<ChallengeSearchFilters>({
    title: '',
    challenge_type: '',
    verification_method: '',
    visibility_scope: [],
    status: [],
    operation_from: '',
    operation_to: '',
    recruitment_from: '',
    recruitment_to: '',
    display_from: '',
    display_to: '',
  });

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { challenges, pagination, isLoading, refetch } = useChallenges(
    filters,
    page,
    20
  );

  const handleFilterChange = (key: keyof ChallengeSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      title: '',
      challenge_type: '',
      verification_method: '',
      visibility_scope: [],
      status: [],
      operation_from: '',
      operation_to: '',
      recruitment_from: '',
      recruitment_to: '',
      display_from: '',
      display_to: '',
    });
    setPage(1);
    refetch();
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteChallenges(selectedIds);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      refetch();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const columns: TableColumn<Challenge>[] = [
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
      key: 'challenge_type',
      label: '유형',
      width: 80,
      render: (value) => <TypeBadge type={value as string} />,
    },
    {
      key: 'id',
      label: '등록번호',
      width: 100,
      render: (value) => {
        const id = value as string;
        return id?.substring(0, 8) || '-';
      },
    },
    {
      key: 'title',
      label: '챌린지명',
      render: (value, row) => (
        <div>
          <div className="font-medium text-[13px]">{value as string}</div>
          {row.subtitle && (
            <div className="text-[11px] text-gray-500">{row.subtitle}</div>
          )}
        </div>
      ),
    },
    {
      key: 'operation_start_date',
      label: '운영기간',
      render: (_, row) => {
        if (!row.operation_start_date && !row.operation_end_date) return '-';
        return `${formatDate(row.operation_start_date || '')}~${formatDate(row.operation_end_date || '')}`;
      },
    },
    {
      key: 'recruitment_start_date',
      label: '모집기간',
      render: (_, row) => {
        if (!row.recruitment_start_date && !row.recruitment_end_date) return '-';
        return `${formatDate(row.recruitment_start_date || '')}~${formatDate(row.recruitment_end_date || '')}`;
      },
    },
    {
      key: 'display_start_date',
      label: '노출기간',
      render: (_, row) => {
        if (!row.display_start_date && !row.display_end_date) return '-';
        return `${formatDate(row.display_start_date || '')}~${formatDate(row.display_end_date || '')}`;
      },
    },
    {
      key: 'visibility_scope',
      label: '공개범위',
      width: 100,
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
      key: 'max_participants',
      label: '모집인원',
      width: 80,
      render: (value) => {
        const max = value as number | null;
        return max ? max.toLocaleString() : '제한없음';
      },
    },
    {
      key: 'current_participants',
      label: '진행중인원',
      width: 90,
      render: (value) => {
        const count = value as number;
        return count?.toLocaleString() || '0';
      },
    },
    {
      key: 'status',
      label: '상태',
      width: 80,
      render: (value) => <StatusBadge status={value as string} />,
    },
    {
      key: 'display_order',
      label: '전시순서',
      width: 70,
      render: (value) => (value as number) || '-',
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
            <h1 className="text-[18px] font-bold text-black">챌린지 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 챌린지 관리
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
              <span className={labelClass}>챌린지명</span>
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleFilterChange('title', e.target.value)}
                className={`${inputClass} w-[160px]`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>챌린지 유형</span>
              <select
                value={filters.challenge_type || ''}
                onChange={(e) => handleFilterChange('challenge_type', e.target.value)}
                className={`${selectClass} w-[120px]`}
              >
                {CHALLENGE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>인증 방식</span>
              <select
                value={filters.verification_method || ''}
                onChange={(e) => handleFilterChange('verification_method', e.target.value)}
                className={`${selectClass} w-[100px]`}
              >
                {VERIFICATION_METHOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>운영기간</span>
              <DatePicker
                value={filters.operation_from ? new Date(filters.operation_from) : null}
                onChange={(date) => handleFilterChange('operation_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.operation_to ? new Date(filters.operation_to) : null}
                onChange={(date) => handleFilterChange('operation_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder="종료일"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>모집기간</span>
              <DatePicker
                value={filters.recruitment_from ? new Date(filters.recruitment_from) : null}
                onChange={(date) => handleFilterChange('recruitment_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.recruitment_to ? new Date(filters.recruitment_to) : null}
                onChange={(date) => handleFilterChange('recruitment_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder="종료일"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>노출기간</span>
              <DatePicker
                value={filters.display_from ? new Date(filters.display_from) : null}
                onChange={(date) => handleFilterChange('display_from', date ? date.toISOString().split('T')[0] : '')}
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.display_to ? new Date(filters.display_to) : null}
                onChange={(date) => handleFilterChange('display_to', date ? date.toISOString().split('T')[0] : '')}
                placeholder="종료일"
              />
            </div>
          </div>

          {/* 3행 */}
          <div className="flex items-center gap-6">
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
            data={challenges}
            totalCount={pagination?.total}
            onRowClick={(row) => setEditingId(row.id)}
            isLoading={isLoading}
            emptyMessage="조회 결과가 없습니다."
            getRowKey={(row) => row.id}
            title="챌린지 리스트"
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

      {/* 챌린지 등록/수정 모달 */}
      <ChallengeFormModal
        challengeId={editingId}
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
        message={`선택한 ${selectedIds.length}개 챌린지를 삭제하시겠습니까?`}
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

