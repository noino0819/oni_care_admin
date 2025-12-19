'use client';

// ============================================
// 공통 코드 마스터 페이지 - 기획서 디자인 참고
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  DataTable,
  Pagination,
  AlertModal,
  FormModal,
  SearchFilterPanel,
  SearchField,
} from '@/components/common';
import { RefreshCw } from 'lucide-react';
import type { CommonCodeMaster, CommonCodeMasterSearchFilters, TableColumn, PaginationInfo } from '@/types';

const IS_ACTIVE_OPTIONS = [
  { value: '', label: '선택해주세요' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const initialFormValues = {
  code_name: '',
  description: '',
  is_active: true,
};

export default function CommonCodeMasterPage() {
  const router = useRouter();
  
  // 조회 상태
  const [filters, setFilters] = useState<CommonCodeMasterSearchFilters>({
    code_name: '',
    is_active: '',
  });
  const [data, setData] = useState<CommonCodeMaster[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommonCodeMaster | null>(null);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 데이터 조회
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.code_name) params.set('code_name', filters.code_name);
      if (filters.is_active) params.set('is_active', filters.is_active);
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/admin/codes/masters?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
        setPagination(result.pagination || null);
      } else {
        setAlertMessage(result.error?.message || '조회 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  // 조회 버튼 클릭
  const handleSearch = () => {
    setPage(1);
    setSearchTriggered(true);
  };

  // 초기화 버튼 클릭
  const handleRefresh = () => {
    setFilters({
      code_name: '',
      is_active: '',
    });
    setPage(1);
    setSearchTriggered(false);
    setData([]);
    setPagination(null);
  };

  // 검색 트리거 시 데이터 조회
  useEffect(() => {
    if (searchTriggered) {
      fetchData();
    }
  }, [searchTriggered, page, fetchData]);

  // 추가 버튼 클릭
  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(initialFormValues);
    setIsModalOpen(true);
  };

  // 행 클릭 (상세 페이지로 이동)
  const handleRowClick = (row: CommonCodeMaster) => {
    router.push(`/settings/common-codes/detail?masterId=${row.id}`);
  };

  // 수정 버튼 클릭 (행 내에서)
  const handleEdit = (row: CommonCodeMaster, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(row);
    setFormValues({
      code_name: row.code_name,
      description: row.description || '',
      is_active: row.is_active,
    });
    setIsModalOpen(true);
  };

  // 폼 값 변경
  const handleFormChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // 저장
  const handleSave = async () => {
    if (!formValues.code_name) {
      setAlertMessage('코드명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/codes/masters/${editingItem.id}`
        : '/api/admin/codes/masters';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });

      const result = await response.json();

      if (result.success) {
        setIsModalOpen(false);
        setAlertMessage(editingItem ? '수정되었습니다.' : '추가되었습니다.');
        fetchData();
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 테이블 컬럼 정의
  const columns: TableColumn<CommonCodeMaster>[] = [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'code_name', label: '코드명', width: 200 },
    { 
      key: 'description', 
      label: '설명', 
      width: 250,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'is_active', 
      label: '사용여부', 
      width: 80, 
      align: 'center',
      render: (value) => (value ? 'Y' : 'N'),
    },
    { key: 'created_by', label: '생성자', width: 100 },
    { 
      key: 'created_at', 
      label: '생성일시', 
      width: 150,
      render: (value) => value ? new Date(value as string).toLocaleString('ko-KR') : '-',
    },
    { key: 'updated_by', label: '수정자', width: 100 },
    { 
      key: 'updated_at', 
      label: '수정일시', 
      width: 150,
      render: (value) => value ? new Date(value as string).toLocaleString('ko-KR') : '-',
    },
  ];

  // 폼 필드 정의
  const formFields = [
    { key: 'code_name', label: '공통코드 마스터 명', type: 'text' as const, required: true },
    { key: 'description', label: '설명', type: 'textarea' as const },
    { key: 'is_active', label: '사용여부', type: 'toggle' as const, required: true },
  ];

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const selectClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow";

  return (
    <AdminLayout>
      <div className="space-y-4 pt-2">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">공통 코드 마스터</h1>
            <span className="text-[13px] text-[#888]">
              설정 &gt; 시스템 관리 &gt; 공통 코드 마스터
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
        <SearchFilterPanel>
          <SearchField label="코드명">
            <input
              type="text"
              value={filters.code_name}
              onChange={(e) => setFilters({ ...filters, code_name: e.target.value })}
              placeholder="코드명을 입력해주세요"
              className={`${inputClass} w-[200px]`}
            />
          </SearchField>
          <SearchField label="사용여부">
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className={`${selectClass} w-[140px]`}
            >
              {IS_ACTIVE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </SearchField>
        </SearchFilterPanel>

        {/* 데이터 테이블 */}
        <div className="relative">
          <div className="absolute right-4 top-3 z-10">
            <Button size="sm" onClick={handleAdd}>
              추가
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={data}
            totalCount={pagination?.total}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage={searchTriggered ? '조회 결과가 없습니다.' : '조회조건을 입력 후 조회해주세요.'}
            getRowKey={(row) => row.id.toString()}
            title="코드 마스터"
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

      {/* 추가/수정 모달 */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title="회원 정보"
        fields={formFields}
        values={formValues}
        onChange={handleFormChange}
        isLoading={isSaving}
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

