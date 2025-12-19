'use client';

// ============================================
// 공통 코드 상세 페이지 - 기획서 디자인 참고 (2패널 구성)
// ============================================

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
  FormModal,
  SearchFilterPanel,
  SearchField,
} from '@/components/common';
import { RefreshCw } from 'lucide-react';
import type { CommonCodeMaster, CommonCode, PaginationInfo } from '@/types';

const IS_ACTIVE_OPTIONS = [
  { value: '', label: '선택해주세요' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

const initialFormValues = {
  code_value: '',
  code_name: '',
  description: '',
  sort_order: 0,
  extra_field1: '',
  extra_field2: '',
  extra_field3: '',
  is_active: true,
};

function CommonCodeDetailContent() {
  const searchParams = useSearchParams();
  const initialMasterId = searchParams.get('masterId');

  // 필터 상태
  const [codeName, setCodeName] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');

  // 마스터 코드 상태
  const [masters, setMasters] = useState<CommonCodeMaster[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(
    initialMasterId ? parseInt(initialMasterId) : null
  );
  const [isMasterLoading, setIsMasterLoading] = useState(false);

  // 공통 코드 상태
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [isCodesLoading, setIsCodesLoading] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommonCode | null>(null);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 마스터 코드 조회
  const fetchMasters = useCallback(async () => {
    setIsMasterLoading(true);
    try {
      const params = new URLSearchParams();
      if (codeName) params.set('code_name', codeName);
      if (isActiveFilter) params.set('is_active', isActiveFilter);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/codes/masters?${params}`);
      const result = await response.json();

      if (result.success) {
        setMasters(result.data || []);
      }
    } catch {
      setAlertMessage('마스터 코드 조회 중 오류가 발생했습니다.');
    } finally {
      setIsMasterLoading(false);
    }
  }, [codeName, isActiveFilter]);

  // 공통 코드 조회
  const fetchCodes = useCallback(async () => {
    if (!selectedMasterId) {
      setCodes([]);
      return;
    }

    setIsCodesLoading(true);
    try {
      const response = await fetch(`/api/admin/codes/${selectedMasterId}`);
      const result = await response.json();

      if (result.success) {
        setCodes(result.data || []);
      }
    } catch {
      setAlertMessage('공통 코드 조회 중 오류가 발생했습니다.');
    } finally {
      setIsCodesLoading(false);
    }
  }, [selectedMasterId]);

  // 초기 로드
  useEffect(() => {
    fetchMasters();
  }, []);

  // 마스터 선택 시 공통 코드 조회
  useEffect(() => {
    fetchCodes();
  }, [selectedMasterId, fetchCodes]);

  // 조회 버튼 클릭
  const handleSearch = () => {
    fetchMasters();
  };

  // 초기화 버튼 클릭
  const handleRefresh = () => {
    setCodeName('');
    setIsActiveFilter('');
    setSelectedMasterId(null);
    setCodes([]);
    fetchMasters();
  };

  // 추가 버튼 클릭
  const handleAdd = () => {
    if (!selectedMasterId) {
      setAlertMessage('마스터 코드를 먼저 선택해주세요.');
      return;
    }
    setEditingItem(null);
    setFormValues(initialFormValues);
    setIsModalOpen(true);
  };

  // 행 클릭 (수정)
  const handleCodeClick = (code: CommonCode) => {
    setEditingItem(code);
    setFormValues({
      code_value: code.code_value,
      code_name: code.code_name,
      description: code.description || '',
      sort_order: code.sort_order,
      extra_field1: code.extra_field1 || '',
      extra_field2: code.extra_field2 || '',
      extra_field3: code.extra_field3 || '',
      is_active: code.is_active,
    });
    setIsModalOpen(true);
  };

  // 폼 값 변경
  const handleFormChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // 저장
  const handleSave = async () => {
    if (!formValues.code_value || !formValues.code_name) {
      setAlertMessage('공통코드와 코드명은 필수입니다.');
      return;
    }

    if (!selectedMasterId) {
      setAlertMessage('마스터 코드를 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/codes/${selectedMasterId}/${editingItem.id}`
        : `/api/admin/codes/${selectedMasterId}`;
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
        fetchCodes();
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 폼 필드 정의
  const formFields = [
    { key: 'code_value', label: '공통코드', type: 'text' as const, required: true },
    { key: 'code_name', label: '코드명', type: 'text' as const, required: true },
    { key: 'sort_order', label: '정렬', type: 'text' as const },
    { key: 'description', label: '설명', type: 'textarea' as const },
    { key: 'extra_field1', label: '추가 1', type: 'text' as const },
    { key: 'extra_field2', label: '추가 2', type: 'text' as const },
    { key: 'extra_field3', label: '추가 3', type: 'text' as const },
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
            <h1 className="text-[18px] font-bold text-black">공통 코드 상세</h1>
            <span className="text-[13px] text-[#888]">
              설정 &gt; 시스템 관리 &gt; 공통 코드 상세
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
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="코드명을 입력해주세요"
              className={`${inputClass} w-[200px]`}
            />
          </SearchField>
          <SearchField label="사용여부">
            <select
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value)}
              className={`${selectClass} w-[140px]`}
            >
              {IS_ACTIVE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </SearchField>
        </SearchFilterPanel>

        {/* 코드관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">코드관리</h2>
          
          <div className="flex gap-4">
            {/* 좌측 패널: 마스터 코드 */}
            <div className="w-[300px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-semibold">▶ 마스터 코드</span>
              </div>
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">아이디</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">마스터 코드명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isMasterLoading ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : masters.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      masters.map((master) => (
                        <tr
                          key={master.id}
                          onClick={() => setSelectedMasterId(master.id)}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${
                            selectedMasterId === master.id
                              ? 'bg-[#fff8dc]'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-[13px]">{master.id}</td>
                          <td className="px-3 py-2 text-[13px]">{master.code_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측 패널: 공통 코드 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold">▶ 공통 코드</span>
                <Button size="sm" onClick={handleAdd}>
                  추가
                </Button>
              </div>
              <div className="border rounded overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">ID</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">마스터 ID</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">공통코드 값</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">공통코드명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">정렬</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">추가1</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">추가2</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">추가3</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">생성자</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">생성일시</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">수정자</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">수정일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCodesLoading ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : !selectedMasterId ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          마스터 코드를 선택해주세요.
                        </td>
                      </tr>
                    ) : codes.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      codes.map((code) => (
                        <tr
                          key={code.id}
                          onClick={() => handleCodeClick(code)}
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2 text-[13px]">{code.id}</td>
                          <td className="px-3 py-2 text-[13px]">{code.master_id}</td>
                          <td className="px-3 py-2 text-[13px]">{code.code_value}</td>
                          <td className="px-3 py-2 text-[13px]">{code.code_name}</td>
                          <td className="px-3 py-2 text-[13px]">{code.description || '~~~'}</td>
                          <td className="px-3 py-2 text-[13px]">{code.sort_order}</td>
                          <td className="px-3 py-2 text-[13px] text-center">{code.is_active ? 'Y' : 'N'}</td>
                          <td className="px-3 py-2 text-[13px]">{code.extra_field1 || '~~~'}</td>
                          <td className="px-3 py-2 text-[13px]">{code.extra_field2 || '~~~'}</td>
                          <td className="px-3 py-2 text-[13px]">{code.extra_field3 || '~~~'}</td>
                          <td className="px-3 py-2 text-[13px]">{code.created_by || '-'}</td>
                          <td className="px-3 py-2 text-[13px]">
                            {code.created_at ? new Date(code.created_at).toLocaleString('ko-KR') : '-'}
                          </td>
                          <td className="px-3 py-2 text-[13px]">{code.updated_by || '-'}</td>
                          <td className="px-3 py-2 text-[13px]">
                            {code.updated_at ? new Date(code.updated_at).toLocaleString('ko-KR') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
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
        size="lg"
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

export default function CommonCodeDetailPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <CommonCodeDetailContent />
    </Suspense>
  );
}

