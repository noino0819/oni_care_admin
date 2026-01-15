'use client';

// ============================================
// 퀴즈 검색 모달
// ============================================

import { useState } from 'react';
import { Button, DataTable, Pagination } from '@/components/common';
import { X, Search, Plus } from 'lucide-react';
import { useQuizzes, type ChallengeQuiz } from '@/hooks/useChallenges';
import type { TableColumn } from '@/types';

interface QuizSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (quizId: string) => void;
  excludeQuizIds: string[];
}

export function QuizSearchModal({
  isOpen,
  onClose,
  onSelect,
  excludeQuizIds,
}: QuizSearchModalProps) {
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const { quizzes, pagination, isLoading, refetch } = useQuizzes(
    searchName,
    searchType,
    page,
    10
  );

  // 이미 추가된 퀴즈 제외
  const filteredQuizzes = quizzes.filter(q => !excludeQuizIds.includes(q.id));

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleSelect = () => {
    if (selectedQuizId) {
      onSelect(selectedQuizId);
      setSelectedQuizId(null);
    }
  };

  const columns: TableColumn<ChallengeQuiz>[] = [
    {
      key: 'radio',
      label: '',
      width: 40,
      render: (_, row) => (
        <input
          type="radio"
          name="quiz-select"
          checked={selectedQuizId === row.id}
          onChange={() => setSelectedQuizId(row.id)}
          className="w-4 h-4 border border-gray-300 accent-[#737373]"
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
        return question.length > 40 ? question.substring(0, 40) + '...' : question;
      },
    },
  ];

  if (!isOpen) return null;

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-[18px] font-bold">퀴즈 검색</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 조건 */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={labelClass}>퀴즈명</span>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={`${inputClass} w-[150px]`}
                placeholder="검색어 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelClass}>유형</span>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className={`${selectClass} w-[120px]`}
              >
                <option value="">전체</option>
                <option value="multiple_choice">다지선다</option>
                <option value="ox">O/X</option>
              </select>
            </div>
            <Button onClick={handleSearch} size="sm" className="flex items-center gap-1">
              <Search className="w-4 h-4" />
              검색
            </Button>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto p-6">
          <DataTable
            columns={columns}
            data={filteredQuizzes}
            onRowClick={(row) => setSelectedQuizId(row.id)}
            isLoading={isLoading}
            emptyMessage="검색 결과가 없습니다."
            getRowKey={(row) => row.id}
            selectedRowKey={selectedQuizId || undefined}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSelect} disabled={!selectedQuizId} className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}

