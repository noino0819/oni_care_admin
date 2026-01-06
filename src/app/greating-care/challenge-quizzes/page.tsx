'use client';

// ============================================
// 챌린지 퀴즈 관리 페이지
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { Button, DataTable, Pagination, ConfirmModal, AlertModal, DatePicker } from '@/components/common';
import { QuizFormModal } from './QuizFormModal';
import { QuizSearchModal } from './QuizSearchModal';
import {
  useQuizManagementChallenges,
  useChallengeQuizzes,
  deleteQuizzes,
  addQuizToChallenge,
  removeQuizFromChallenge,
  type Challenge,
  type ChallengeQuiz,
  type ChallengeSearchFilters,
} from '@/hooks/useChallenges';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Plus, ArrowUp, ArrowDown, Trash2, Search } from 'lucide-react';
import type { TableColumn } from '@/types';

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
];

// 상태 표시 컴포넌트
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: '작성중', className: 'bg-gray-100 text-gray-600' },
    recruiting: { label: '모집중', className: 'bg-blue-100 text-blue-600' },
    in_progress: { label: '진행중', className: 'bg-green-100 text-green-600' },
    completed: { label: '완료', className: 'bg-gray-100 text-gray-500' },
  };
  
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] ${config.className}`}>
      {config.label}
    </span>
  );
};

export default function ChallengeQuizzesPage() {
  const [filters, setFilters] = useState<ChallengeSearchFilters>({
    title: '',
    visibility_scope: [],
    status: [],
    operation_from: '',
    operation_to: '',
    recruitment_from: '',
    recruitment_to: '',
    display_from: '',
    display_to: '',
  });

  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [showQuizFormModal, setShowQuizFormModal] = useState(false);
  const [showQuizSearchModal, setShowQuizSearchModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { challenges, isLoading: challengesLoading, refetch: refetchChallenges } = useQuizManagementChallenges(filters);
  const { quizzes, isLoading: quizzesLoading, refetch: refetchQuizzes } = useChallengeQuizzes(selectedChallengeId);

  const handleFilterChange = (key: keyof ChallengeSearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    refetchChallenges();
  };

  const handleRefresh = () => {
    setFilters({
      title: '',
      visibility_scope: [],
      status: [],
      operation_from: '',
      operation_to: '',
      recruitment_from: '',
      recruitment_to: '',
      display_from: '',
      display_to: '',
    });
    setSelectedChallengeId(null);
    setSelectedQuizIds([]);
    refetchChallenges();
  };

  const handleChallengeSelect = (challenge: Challenge) => {
    setSelectedChallengeId(challenge.id);
    setSelectedQuizIds([]);
  };

  const handleDeleteQuizzes = async () => {
    if (selectedQuizIds.length === 0 || !selectedChallengeId) return;
    
    try {
      // 챌린지에서 퀴즈 연결 해제
      for (const quizId of selectedQuizIds) {
        await removeQuizFromChallenge(selectedChallengeId, quizId);
      }
      setSelectedQuizIds([]);
      setShowDeleteConfirm(false);
      refetchQuizzes();
    } catch {
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddQuiz = async (quizId: string) => {
    if (!selectedChallengeId) return;
    
    try {
      await addQuizToChallenge(selectedChallengeId, quizId, quizzes.length);
      refetchQuizzes();
      setShowQuizSearchModal(false);
    } catch {
      setAlertMessage('퀴즈 추가 중 오류가 발생했습니다.');
    }
  };

  // 챌린지 목록 테이블 컬럼
  const challengeColumns: TableColumn<Challenge>[] = [
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
      key: 'status',
      label: '상태',
      width: 80,
      render: (value) => <StatusBadge status={value as string} />,
    },
  ];

  // 퀴즈 목록 테이블 컬럼
  const quizColumns: TableColumn<ChallengeQuiz>[] = [
    {
      key: 'checkbox',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedQuizIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            if (e.target.checked) {
              setSelectedQuizIds(prev => [...prev, row.id]);
            } else {
              setSelectedQuizIds(prev => prev.filter(id => id !== row.id));
            }
          }}
          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
        />
      ),
    },
    {
      key: 'quiz_name',
      label: '퀴즈명',
    },
    {
      key: 'quiz_type',
      label: '유형',
      width: 100,
      render: (value) => {
        const type = value as string;
        return type === 'multiple_choice' ? '다지선다' : 'O/X';
      },
    },
    {
      key: 'question',
      label: '문제',
      render: (value) => {
        const question = value as string;
        return question.length > 50 ? question.substring(0, 50) + '...' : question;
      },
    },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (_, row, index) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              // 순서 올리기 로직
            }}
          >
            <ArrowUp className="w-4 h-4 text-gray-500" />
          </button>
          <button
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            disabled={index === quizzes.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              // 순서 내리기 로직
            }}
          >
            <ArrowDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ),
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
            <h1 className="text-[18px] font-bold text-black">챌린지 퀴즈 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 챌린지 퀴즈 관리
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

          {/* 2행 */}
          <div className="flex items-center gap-6">
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
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 좌측: 챌린지 목록 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-[14px] font-semibold mb-3">퀴즈 챌린지 목록</h3>
            <DataTable
              columns={challengeColumns}
              data={challenges}
              onRowClick={handleChallengeSelect}
              isLoading={challengesLoading}
              emptyMessage="조회 결과가 없습니다."
              getRowKey={(row) => row.id}
              rowClassName={(row) =>
                row.id === selectedChallengeId ? 'bg-blue-50' : ''
              }
            />
          </div>

          {/* 우측: 퀴즈 목록 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">
                등록된 퀴즈 목록
                {selectedChallengeId && (
                  <span className="text-[12px] text-gray-500 font-normal ml-2">
                    ({quizzes.length}개)
                  </span>
                )}
              </h3>
              {selectedChallengeId && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedQuizIds.length > 0 && setShowDeleteConfirm(true)}
                    disabled={selectedQuizIds.length === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowQuizSearchModal(true)}
                    className="flex items-center gap-1"
                  >
                    <Search className="w-4 h-4" />
                    퀴즈 검색
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowQuizFormModal(true)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    퀴즈 등록
                  </Button>
                </div>
              )}
            </div>

            {selectedChallengeId ? (
              <DataTable
                columns={quizColumns}
                data={quizzes}
                onRowClick={(row) => {
                  setEditingQuizId(row.id);
                  setShowQuizFormModal(true);
                }}
                isLoading={quizzesLoading}
                emptyMessage="등록된 퀴즈가 없습니다."
                getRowKey={(row) => row.id}
              />
            ) : (
              <div className="text-center py-10 text-[13px] text-gray-500">
                좌측에서 챌린지를 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 퀴즈 등록/수정 모달 */}
      {showQuizFormModal && (
        <QuizFormModal
          quizId={editingQuizId}
          challengeId={selectedChallengeId}
          isOpen={showQuizFormModal}
          onClose={() => {
            setShowQuizFormModal(false);
            setEditingQuizId(null);
          }}
          onSaved={() => {
            refetchQuizzes();
            setShowQuizFormModal(false);
            setEditingQuizId(null);
          }}
        />
      )}

      {/* 퀴즈 검색 모달 */}
      {showQuizSearchModal && (
        <QuizSearchModal
          isOpen={showQuizSearchModal}
          onClose={() => setShowQuizSearchModal(false)}
          onSelect={handleAddQuiz}
          excludeQuizIds={quizzes.map(q => q.id)}
        />
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteQuizzes}
        message={`선택한 ${selectedQuizIds.length}개 퀴즈를 챌린지에서 제거하시겠습니까?`}
        cancelText="취소"
        confirmText="제거"
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

