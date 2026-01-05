'use client';

// ============================================
// API 권한 관리 페이지
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
  ConfirmModal,
  Checkbox,
} from '@/components/common';
import { RefreshCw, Plus } from 'lucide-react';
import type { Role, AdminApi, RoleApiPermission } from '@/types';
import { apiClient } from '@/lib/api-client';

// 역할 모달 컴포넌트
interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Role>) => void;
  isLoading?: boolean;
}

function RoleModal({ isOpen, onClose, onSave, isLoading }: RoleModalProps) {
  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        role_name: '',
        description: '',
        is_active: true,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">역할 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              권한명
            </div>
            <input
              type="text"
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="권한명 입력"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              설명
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="설명 입력"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <div className="flex-1 px-3 py-2">
              <Checkbox
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            취소
          </Button>
          <Button onClick={() => onSave(formData)} isLoading={isLoading} className="min-w-[100px]">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// API 모달 컴포넌트
interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AdminApi>) => void;
  isLoading?: boolean;
}

function ApiModal({ isOpen, onClose, onSave, isLoading }: ApiModalProps) {
  const [formData, setFormData] = useState({
    api_name: '',
    api_path: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        api_name: '',
        api_path: '',
        description: '',
        is_active: true,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">API 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              API명
            </div>
            <input
              type="text"
              value={formData.api_name}
              onChange={(e) => setFormData({ ...formData, api_name: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="API명 입력"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              API 경로
            </div>
            <input
              type="text"
              value={formData.api_path}
              onChange={(e) => setFormData({ ...formData, api_path: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="/admin/v1/..."
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              설명
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="설명 입력"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <div className="flex-1 px-3 py-2">
              <Checkbox
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            취소
          </Button>
          <Button onClick={() => onSave(formData)} isLoading={isLoading} className="min-w-[100px]">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ApiPermissionsPage() {
  // 역할 상태
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // API 및 권한 상태
  const [apis, setApis] = useState<AdminApi[]>([]);
  const [permissions, setPermissions] = useState<RoleApiPermission[]>([]);
  
  // 모달 상태
  const [roleModal, setRoleModal] = useState(false);
  const [apiModal, setApiModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 역할 조회
  const fetchRoles = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; data: Role[] }>('/admin/roles?limit=100');
      if (result.success) {
        setRoles(result.data || []);
      }
    } catch {
      console.error('역할 조회 실패');
    }
  }, []);

  // API 조회
  const fetchApis = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; data: AdminApi[] }>('/admin/apis?limit=100');
      if (result.success) {
        setApis(result.data || []);
      }
    } catch {
      console.error('API 조회 실패');
    }
  }, []);

  // 역할별 API 권한 조회
  const fetchPermissions = useCallback(async (roleId: number) => {
    setIsLoading(true);
    try {
      const result = await apiClient.get<{ success: boolean; data: RoleApiPermission[] }>(`/admin/roles/${roleId}/api-permissions`);
      if (result.success) {
        setPermissions(result.data || []);
      }
    } catch {
      setAlertMessage('권한 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchRoles();
    fetchApis();
  }, [fetchRoles, fetchApis]);

  // 역할 선택
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    fetchPermissions(role.id);
  };

  // 권한 변경
  const handlePermissionChange = (apiId: number, checked: boolean) => {
    setPermissions(prev =>
      prev.map(p =>
        p.api_id === apiId ? { ...p, is_permitted: checked } : p
      )
    );
  };

  // 역할 추가
  const handleSaveRole = async (data: Partial<Role>) => {
    if (!data.role_name) {
      setAlertMessage('권한명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiClient.post<{ success: boolean; error?: { message: string } }>('/admin/roles', data);
      if (result.success) {
        setAlertMessage('추가되었습니다.');
        setRoleModal(false);
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

  // API 추가
  const handleSaveApi = async (data: Partial<AdminApi>) => {
    if (!data.api_name || !data.api_path) {
      setAlertMessage('API명과 API 경로는 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiClient.post<{ success: boolean; error?: { message: string } }>('/admin/apis', data);
      if (result.success) {
        setAlertMessage('추가되었습니다.');
        setApiModal(false);
        fetchApis();
        if (selectedRole) {
          fetchPermissions(selectedRole.id);
        }
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 권한 저장
  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      const result = await apiClient.put<{ success: boolean; error?: { message: string } }>(`/admin/roles/${selectedRole.id}/api-permissions`, { permissions });
      if (result.success) {
        setAlertMessage('저장되었습니다.');
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 초기화
  const handleRefresh = () => {
    fetchRoles();
    fetchApis();
    if (selectedRole) {
      fetchPermissions(selectedRole.id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">API 권한 관리</h1>
            <span className="text-[13px] text-[#888]">
              어드민 관리 &gt; 권한 관리 &gt; API 권한 관리
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSavePermissions} size="sm" isLoading={isSaving}>
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

        {/* API 권한 관리 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">API 권한관리</h2>
          
          <div className="flex gap-4">
            {/* 좌측: 역할 목록 */}
            <div className="w-[400px] flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold text-black">▶ 역할</h3>
                <button
                  onClick={() => setRoleModal(true)}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f5f0e1]">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left w-[80px]">권한 ID</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left w-[80px]">권한명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[60px]">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr
                        key={role.id}
                        onClick={() => handleRoleSelect(role)}
                        className={`border-b last:border-0 cursor-pointer transition-colors ${
                          selectedRole?.id === role.id 
                            ? 'bg-[#f5f0e1]' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2 text-[13px]">{role.role_code}</td>
                        <td className="px-3 py-2 text-[13px]">{role.role_name}</td>
                        <td className="px-3 py-2 text-[13px]">{role.description || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox checked={role.is_active} disabled />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측: API 권한 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold text-black">▶ 권한 관리</h3>
                <button
                  onClick={() => setApiModal(true)}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="border rounded overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#f5f0e1]">
                    <tr>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left w-[100px]">API 명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[60px]">권한</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">API 경로</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">설명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[60px]">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : !selectedRole ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          좌측에서 역할을 선택해주세요.
                        </td>
                      </tr>
                    ) : permissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          등록된 API가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      permissions.map((perm) => (
                        <tr key={perm.api_id} className="border-b last:border-0">
                          <td className="px-3 py-2 text-[13px]">{perm.api_name}</td>
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={perm.is_permitted}
                              onChange={(checked) => handlePermissionChange(perm.api_id, checked)}
                            />
                          </td>
                          <td className="px-3 py-2 text-[13px]">{perm.api_path}</td>
                          <td className="px-3 py-2 text-[13px]">{perm.description || '-'}</td>
                          <td className="px-3 py-2 text-center text-[13px]">
                            {perm.is_active ? 'Y' : 'N'}
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

      {/* 역할 모달 */}
      <RoleModal
        isOpen={roleModal}
        onClose={() => setRoleModal(false)}
        onSave={handleSaveRole}
        isLoading={isSaving}
      />

      {/* API 모달 */}
      <ApiModal
        isOpen={apiModal}
        onClose={() => setApiModal(false)}
        onSave={handleSaveApi}
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





