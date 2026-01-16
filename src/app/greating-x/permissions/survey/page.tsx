'use client';

// ============================================
// 설문 권한 관리 페이지
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
  ConfirmModal,
  SearchFilterPanel,
  SearchField,
} from '@/components/common';
import { RefreshCw, Plus } from 'lucide-react';
import type { SecurityGroup, SecurityGroupItem } from '@/types';
import { apiClient } from '@/lib/api-client';

// 모달 컴포넌트
interface SecurityGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SecurityGroup>) => void;
  initialData?: SecurityGroup | null;
  isLoading?: boolean;
}

function SecurityGroupModal({ isOpen, onClose, onSave, initialData, isLoading }: SecurityGroupModalProps) {
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        group_name: initialData.group_name || '',
        description: initialData.description || '',
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        group_name: '',
        description: '',
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">보안그룹</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              보안그룹 명
            </div>
            <input
              type="text"
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="보안그룹명을 입력하세요"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              설명
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="설명을 입력하세요"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <select
              value={formData.is_active ? 'Y' : 'N'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'Y' })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          </div>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            취소하기
          </Button>
          <Button onClick={() => onSave(formData)} isLoading={isLoading} className="min-w-[100px]">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// 보안 항목 추가 모달
interface SecurityItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SecurityGroupItem>) => void;
  isLoading?: boolean;
}

function SecurityItemModal({ isOpen, onClose, onSave, isLoading }: SecurityItemModalProps) {
  const [formData, setFormData] = useState({
    entry_path: '',
    company_code: '',
    company_name: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        entry_path: '',
        company_code: '',
        company_name: '',
        is_active: true,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">보안 항목 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              진입경로
            </div>
            <input
              type="text"
              value={formData.entry_path}
              onChange={(e) => setFormData({ ...formData, entry_path: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="진입경로 코드"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              회사코드
            </div>
            <input
              type="text"
              value={formData.company_code}
              onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="회사 코드"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              회사명
            </div>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="회사/지점명"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[120px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <select
              value={formData.is_active ? 'Y' : 'N'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'Y' })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          </div>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            취소하기
          </Button>
          <Button onClick={() => onSave(formData)} isLoading={isLoading} className="min-w-[100px]">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// ID 마스킹 함수
function maskId(id: string): string {
  if (!id || id.length <= 5) return '*****';
  return '*****';
}

// 날짜 포맷 함수
function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\./g, '-').replace(' ', ' ');
}

export default function SurveyPermissionPage() {
  // 필터 상태
  const [filters, setFilters] = useState({
    group_name: '',
    group_id: '',
  });

  // 보안그룹 상태
  const [groups, setGroups] = useState<SecurityGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupLoading, setIsGroupLoading] = useState(false);

  // 보안항목 상태
  const [items, setItems] = useState<SecurityGroupItem[]>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);

  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [groupModal, setGroupModal] = useState<{
    isOpen: boolean;
    data: SecurityGroup | null;
  }>({ isOpen: false, data: null });
  const [itemModal, setItemModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 보안그룹 조회
  const fetchGroups = useCallback(async () => {
    setIsGroupLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filters.group_name) params.group_name = filters.group_name;
      if (filters.group_id) params.group_id = filters.group_id;

      const result = await apiClient.get<SecurityGroup[]>('/admin/security-groups', params);

      if (result.success) {
        setGroups(result.data || []);
      }
    } catch {
      setAlertMessage('보안그룹 조회 중 오류가 발생했습니다.');
    } finally {
      setIsGroupLoading(false);
    }
  }, [filters.group_name, filters.group_id]);

  // 보안항목 조회
  const fetchItems = useCallback(async () => {
    if (!selectedGroupId) {
      setItems([]);
      return;
    }

    setIsItemLoading(true);
    try {
      const result = await apiClient.get<SecurityGroupItem[]>(`/admin/security-groups/${selectedGroupId}/items`);

      if (result.success) {
        setItems(result.data || []);
      }
    } catch {
      setAlertMessage('보안항목 조회 중 오류가 발생했습니다.');
    } finally {
      setIsItemLoading(false);
    }
  }, [selectedGroupId]);

  // 초기 로드
  useEffect(() => {
    fetchGroups();
  }, []);

  // 그룹 선택 시 항목 조회
  useEffect(() => {
    fetchItems();
  }, [selectedGroupId, fetchItems]);

  // 조회 버튼
  const handleSearch = () => {
    fetchGroups();
    setSelectedGroupId(null);
  };

  // 초기화 버튼
  const handleRefresh = () => {
    setFilters({ group_name: '', group_id: '' });
    setSelectedGroupId(null);
    setItems([]);
    fetchGroups();
  };

  // 보안그룹 추가/수정 저장
  const handleSaveGroup = async (data: Partial<SecurityGroup>) => {
    if (!data.group_name) {
      setAlertMessage('보안그룹명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!groupModal.data;
      const result = isEdit
        ? await apiClient.put(`/admin/security-groups/${groupModal.data!.id}`, data)
        : await apiClient.post('/admin/security-groups', data);

      if (result.success) {
        setAlertMessage(isEdit ? '수정되었습니다.' : '추가되었습니다.');
        setGroupModal({ isOpen: false, data: null });
        fetchGroups();
      } else {
        setAlertMessage('저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 보안항목 추가 저장
  const handleSaveItem = async (data: Partial<SecurityGroupItem>) => {
    if (!selectedGroupId) {
      setAlertMessage('보안그룹을 먼저 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiClient.post(`/admin/security-groups/${selectedGroupId}/items`, data);

      if (result.success) {
        setAlertMessage('추가되었습니다.');
        setItemModal(false);
        fetchItems();
      } else {
        setAlertMessage('저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">설문 권한 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅-X 관리 &gt; 권한 관리 &gt; 설문 권한 관리
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
          <SearchField label="그룹명">
            <input
              type="text"
              value={filters.group_name}
              onChange={(e) => setFilters({ ...filters, group_name: e.target.value })}
              className={`${inputClass} w-[180px]`}
              placeholder="보안그룹명"
            />
          </SearchField>
          <SearchField label="보안그룹 ID">
            <input
              type="text"
              value={filters.group_id}
              onChange={(e) => setFilters({ ...filters, group_id: e.target.value })}
              className={`${inputClass} w-[180px]`}
              placeholder="보안그룹 ID"
            />
          </SearchField>
        </SearchFilterPanel>

        {/* 설문 권한 설정 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">설문 권한 설정</h2>
          
          <div className="flex gap-4">
            {/* 좌측 패널: 보안 그룹 목록 */}
            <div className="w-[45%] flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold">▶ 보안 그룹 목록</span>
                <Button 
                  size="sm" 
                  onClick={() => setGroupModal({ isOpen: true, data: null })}
                  className="h-[26px]"
                >
                  추가
                </Button>
              </div>
              <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">ID</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">그룹명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isGroupLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : groups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      groups.map((group) => (
                        <tr
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          onDoubleClick={() => setGroupModal({ isOpen: true, data: group })}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${
                            selectedGroupId === group.id
                              ? 'bg-[#fff8dc]'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-[13px]">{maskId(group.id)}</td>
                          <td className="px-3 py-2 text-[13px]">{group.group_name}</td>
                          <td className="px-3 py-2 text-[13px]">{group.description || '-'}</td>
                          <td className="px-3 py-2 text-[13px] text-center">{group.is_active ? 'Y' : 'N'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측 패널: 보안 항목 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold">▶ 보안 항목</span>
                <Button 
                  size="sm" 
                  onClick={() => setItemModal(true)}
                  className="h-[26px]"
                  disabled={!selectedGroupId}
                >
                  추가
                </Button>
              </div>
              <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">인증그룹 ID</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">진입경로</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">회사코드</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">회사명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isItemLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : !selectedGroupId ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          보안그룹을 선택해주세요.
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 text-[13px]">{maskId(item.id)}</td>
                          <td className="px-3 py-2 text-[13px]">{item.entry_path || '-'}</td>
                          <td className="px-3 py-2 text-[13px]">{item.company_code || '-'}</td>
                          <td className="px-3 py-2 text-[13px]">{item.company_name || '-'}</td>
                          <td className="px-3 py-2 text-[13px] text-center">{item.is_active ? 'Y' : 'N'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 보안 그룹 목록 테이블 (전체 정보) */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">보안 그룹 목록</h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafafa] border-b">
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">보안그룹 ID</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">그룹명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성자</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경자</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      onDoubleClick={() => setGroupModal({ isOpen: true, data: group })}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        selectedGroupId === group.id
                          ? 'bg-[#fff8dc]'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-[13px]">{maskId(group.id)}</td>
                      <td className="px-3 py-2 text-[13px]">{group.group_name}</td>
                      <td className="px-3 py-2 text-[13px]">{group.description || '-'}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{group.is_active ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(group.created_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{group.created_by || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(group.updated_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{group.updated_by || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 보안그룹 모달 */}
      <SecurityGroupModal
        isOpen={groupModal.isOpen}
        onClose={() => setGroupModal({ isOpen: false, data: null })}
        onSave={handleSaveGroup}
        initialData={groupModal.data}
        isLoading={isSaving}
      />

      {/* 보안항목 추가 모달 */}
      <SecurityItemModal
        isOpen={itemModal}
        onClose={() => setItemModal(false)}
        onSave={handleSaveItem}
        isLoading={isSaving}
      />

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />

      {/* 확인 모달 */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          message={confirmModal.message}
          confirmText="확인"
          cancelText="취소"
        />
      )}
    </AdminLayout>
  );
}






