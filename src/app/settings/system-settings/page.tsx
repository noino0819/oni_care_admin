'use client';

// ============================================
// 환경설정 페이지 - 기획서 디자인 참고
// ============================================

import { useState, useCallback, useEffect } from 'react';
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
import type { SystemSetting, SystemSettingSearchFilters, SortConfig, TableColumn, PaginationInfo } from '@/types';
import { apiClient } from '@/lib/api-client';

const IS_ACTIVE_OPTIONS = [
  { value: '', label: '선택해주세요' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const initialFormValues = {
  setting_key: '',
  setting_name: '',
  setting_value: '',
  description: '',
  is_active: true,
};

export default function SystemSettingsPage() {
  // 조회 상태
  const [filters, setFilters] = useState<SystemSettingSearchFilters>({
    setting_key: '',
    setting_name: '',
    is_active: '',
  });
  const [data, setData] = useState<SystemSetting[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemSetting | null>(null);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 데이터 조회
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.setting_key) params.set('setting_key', filters.setting_key);
      if (filters.setting_name) params.set('setting_name', filters.setting_name);
      if (filters.is_active) params.set('is_active', filters.is_active);
      params.set('page', page.toString());
      params.set('limit', '20');

      const result = await apiClient.get<{ success: boolean; data: SystemSetting[]; pagination: PaginationInfo; error?: { message: string } }>(`/admin/settings/system?${params}`);

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
  };

  // 초기화 버튼 클릭
  const handleRefresh = () => {
    setFilters({
      setting_key: '',
      setting_name: '',
      is_active: '',
    });
    setPage(1);
  };

  // 페이지 로드 및 조건 변경 시 데이터 조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 추가 버튼 클릭
  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(initialFormValues);
    setIsModalOpen(true);
  };

  // 행 클릭 (수정)
  const handleRowClick = (row: SystemSetting) => {
    setEditingItem(row);
    setFormValues({
      setting_key: row.setting_key,
      setting_name: row.setting_name,
      setting_value: row.setting_value || '',
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
    if (!formValues.setting_key || !formValues.setting_name) {
      setAlertMessage('환경변수키와 환경변수명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const result = editingItem
        ? await apiClient.put<{ success: boolean; error?: { message: string } }>(`/admin/settings/system/${editingItem.id}`, formValues)
        : await apiClient.post<{ success: boolean; error?: { message: string } }>('/admin/settings/system', formValues);

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
  const columns: TableColumn<SystemSetting>[] = [
    { key: 'id', label: '설정키', width: 80 },
    { key: 'setting_key', label: '키', width: 150 },
    { key: 'setting_name', label: '변수명', width: 180 },
    { 
      key: 'setting_value', 
      label: '변수값', 
      width: 120,
      render: (value) => {
        const str = (value as string) || '';
        return str.length > 10 ? str.substring(0, 10) + '...' : str || '-';
      },
    },
    { 
      key: 'description', 
      label: '설명', 
      width: 180,
      render: (value) => {
        const str = (value as string) || '';
        return str.length > 20 ? str.substring(0, 20) + '...' : str || '-';
      },
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
    { key: 'setting_key', label: '환경변수키', type: 'text' as const, required: true },
    { key: 'setting_name', label: '환경변수명', type: 'text' as const, required: true },
    { key: 'setting_value', label: '환경변수 값', type: 'text' as const },
    { key: 'description', label: '설명', type: 'textarea' as const },
    { key: 'is_active', label: '사용여부', type: 'toggle' as const, required: true },
  ];

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const selectClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">환경설정</h1>
            <span className="text-[13px] text-[#888]">
              설정 &gt; 시스템 관리 &gt; 환경설정
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
          <SearchField label="변수키">
            <input
              type="text"
              value={filters.setting_key}
              onChange={(e) => setFilters({ ...filters, setting_key: e.target.value })}
              placeholder="변수 키 입력"
              className={`${inputClass} w-[200px]`}
            />
          </SearchField>
          <SearchField label="변수명">
            <input
              type="text"
              value={filters.setting_name}
              onChange={(e) => setFilters({ ...filters, setting_name: e.target.value })}
              placeholder="변수 명 입력"
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
        <DataTable
          columns={columns}
          data={data}
          totalCount={pagination?.total}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          emptyMessage="조회 결과가 없습니다."
          getRowKey={(row) => row.id.toString()}
          title="시스템 환경설정"
          headerAction={
            <Button size="sm" onClick={handleAdd}>
              추가
            </Button>
          }
        />

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

