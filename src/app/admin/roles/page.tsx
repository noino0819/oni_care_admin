'use client';

// ============================================
// 역할 관리 페이지
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
  ConfirmModal,
  SearchFilterPanel,
  SearchField,
  Checkbox,
} from '@/components/common';
import { RefreshCw, Plus } from 'lucide-react';
import type { Role } from '@/types';

// 역할 모달 컴포넌트
interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Role>) => void;
  initialData?: Role | null;
  isLoading?: boolean;
}

function RoleModal({ isOpen, onClose, onSave, initialData, isLoading }: RoleModalProps) {
  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        role_name: initialData.role_name || '',
        description: initialData.description || '',
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        role_name: '',
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
          <h2 className="text-lg font-bold text-gray-900">역할 정보</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {/* 역할명 */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              역할명
            </div>
            <input
              type="text"
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              maxLength={20}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="20자이내 입력"
            />
          </div>

          {/* 설명 */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              설명
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="설명을 작성해주세요"
            />
          </div>

          {/* 사용여부 */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <div className="flex-1 px-3 py-2 flex items-center gap-4">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active === true}
                  onChange={() => setFormData({ ...formData, is_active: true })}
                  className="w-4 h-4"
                />
                <span className="text-[14px]">Y</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active === false}
                  onChange={() => setFormData({ ...formData, is_active: false })}
                  className="w-4 h-4"
                />
                <span className="text-[14px]">N</span>
              </label>
            </div>
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
  }).replace(/\./g, '-');
}

export default function RolesPage() {
  // 필터 상태
  const [filters, setFilters] = useState({
    role_name: '',
    is_active_y: false,
    is_active_n: false,
  });

  // 역할 상태
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [roleModal, setRoleModal] = useState<{
    isOpen: boolean;
    data: Role | null;
  }>({ isOpen: false, data: null });
  const [isSaving, setIsSaving] = useState(false);

  // 역할 조회
  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role_name) params.set('role_name', filters.role_name);
      
      // 사용여부 필터
      if (filters.is_active_y && !filters.is_active_n) {
        params.set('is_active', 'Y');
      } else if (!filters.is_active_y && filters.is_active_n) {
        params.set('is_active', 'N');
      }
      
      params.set('limit', '100');

      const response = await fetch(`/api/admin/roles?${params}`);
      const result = await response.json();

      if (result.success) {
        setRoles(result.data || []);
      }
    } catch {
      setAlertMessage('역할 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // 초기 로드
  useEffect(() => {
    fetchRoles();
  }, []);

  // 조회 버튼
  const handleSearch = () => {
    fetchRoles();
  };

  // 초기화 버튼
  const handleRefresh = () => {
    setFilters({
      role_name: '',
      is_active_y: false,
      is_active_n: false,
    });
    fetchRoles();
  };

  // 역할 저장
  const handleSaveRole = async (data: Partial<Role>) => {
    if (!data.role_name) {
      setAlertMessage('역할명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!roleModal.data;
      const url = isEdit 
        ? `/api/admin/roles/${roleModal.data!.id}`
        : '/api/admin/roles';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setAlertMessage(isEdit ? '수정되었습니다.' : '추가되었습니다.');
        setRoleModal({ isOpen: false, data: null });
        fetchRoles();
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
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
            <h1 className="text-[18px] font-bold text-black">역할 관리</h1>
            <span className="text-[13px] text-[#888]">
              어드민 관리 &gt; 어드민 권한 관리 &gt; 역할 관리
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm">
              조회
            </Button>
            <Button variant="secondary" size="sm">
              저장
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
          <SearchField label="역할명">
            <input
              type="text"
              value={filters.role_name}
              onChange={(e) => setFilters({ ...filters, role_name: e.target.value })}
              className={`${inputClass} w-[200px]`}
              placeholder="역할명"
            />
          </SearchField>
          <SearchField label="사용여부">
            <div className="flex items-center gap-3">
              <Checkbox
                label="Y"
                checked={filters.is_active_y}
                onChange={(checked) => setFilters({ ...filters, is_active_y: checked })}
              />
              <Checkbox
                label="N"
                checked={filters.is_active_n}
                onChange={(checked) => setFilters({ ...filters, is_active_n: checked })}
              />
            </div>
          </SearchField>
        </SearchFilterPanel>

        {/* 역할 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-black">역할 목록</h2>
            <button
              onClick={() => setRoleModal({ isOpen: true, data: null })}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafafa] border-b">
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">역할 코드</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">역할명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성자</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경자</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr
                      key={role.id}
                      onClick={() => setRoleModal({ isOpen: true, data: role })}
                      className="border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-[13px]">{role.role_code}</td>
                      <td className="px-3 py-2 text-[13px]">{role.role_name}</td>
                      <td className="px-3 py-2 text-[13px]">{role.description || '-'}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{role.is_active ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(role.created_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{role.created_by || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(role.updated_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{role.updated_by || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 역할 모달 */}
      <RoleModal
        isOpen={roleModal.isOpen}
        onClose={() => setRoleModal({ isOpen: false, data: null })}
        onSave={handleSaveRole}
        initialData={roleModal.data}
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

