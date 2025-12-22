'use client';

// ============================================
// 관리자 회원 조회 페이지
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
import type { AdminUserAccount, Company } from '@/types';

// 관리자 회원 모달 컴포넌트
interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AdminUserAccount>) => void;
  initialData?: AdminUserAccount | null;
  companies: Company[];
  isLoading?: boolean;
}

function AdminUserModal({ isOpen, onClose, onSave, initialData, companies, isLoading }: AdminUserModalProps) {
  const [formData, setFormData] = useState({
    login_id: '',
    employee_name: '',
    department_name: '',
    company_id: null as number | null,
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        login_id: initialData.login_id || '',
        employee_name: initialData.employee_name || '',
        department_name: initialData.department_name || '',
        company_id: initialData.company_id || null,
        phone: initialData.phone || '',
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        login_id: '',
        employee_name: '',
        department_name: '',
        company_id: null,
        phone: '',
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">회원 정보</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {/* 1행: 로그인 ID, 직원명 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                로그인 ID
              </div>
              <input
                type="text"
                value={formData.login_id}
                onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="로그인 ID"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                직원명
              </div>
              <input
                type="text"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="직원명"
              />
            </div>
          </div>

          {/* 2행: 부서명, 회사명 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                부서명
              </div>
              <input
                type="text"
                value={formData.department_name}
                onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="부서명 입력"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                회사명
              </div>
              <select
                value={formData.company_id || ''}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value ? parseInt(e.target.value) : null })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              >
                <option value="">선택해주세요</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3행: 핸드폰 번호, 사용여부 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                핸드폰 번호
              </div>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="010-0000-0000"
              />
            </div>
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
  if (!id) return '-';
  const visible = id.substring(0, 4);
  return `${visible}***`;
}

// 이름 마스킹 함수
function maskName(name: string): string {
  if (!name || name.length < 2) return name || '-';
  return `${name[0]}*${name.slice(2)}`;
}

// 전화번호 마스킹 함수
function maskPhone(phone: string): string {
  if (!phone) return '-';
  const parts = phone.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2');
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

export default function AdminUsersPage() {
  // 필터 상태
  const [filters, setFilters] = useState({
    company_name: '',
    department_name: '',
    employee_name: '',
    login_id: '',
  });

  // 회사 목록
  const [companies, setCompanies] = useState<Company[]>([]);

  // 관리자 회원 상태
  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    data: AdminUserAccount | null;
  }>({ isOpen: false, data: null });
  const [isSaving, setIsSaving] = useState(false);

  // 회사 목록 조회
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/companies?limit=100');
      const result = await response.json();
      if (result.success) {
        setCompanies(result.data || []);
      }
    } catch {
      console.error('회사 조회 실패');
    }
  }, []);

  // 관리자 회원 조회
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_name) params.set('company_name', filters.company_name);
      if (filters.department_name) params.set('department_name', filters.department_name);
      if (filters.employee_name) params.set('employee_name', filters.employee_name);
      if (filters.login_id) params.set('login_id', filters.login_id);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/admin-users?${params}`);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
      }
    } catch {
      setAlertMessage('관리자 회원 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // 초기 로드
  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  // 조회 버튼
  const handleSearch = () => {
    fetchUsers();
  };

  // 초기화 버튼
  const handleRefresh = () => {
    setFilters({
      company_name: '',
      department_name: '',
      employee_name: '',
      login_id: '',
    });
    fetchUsers();
  };

  // 관리자 저장
  const handleSaveUser = async (data: Partial<AdminUserAccount>) => {
    if (!data.login_id || !data.employee_name) {
      setAlertMessage('로그인 ID와 직원명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!userModal.data;
      const url = isEdit 
        ? `/api/admin/admin-users/${userModal.data!.id}`
        : '/api/admin/admin-users';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setAlertMessage(isEdit ? '수정되었습니다.' : '추가되었습니다.');
        setUserModal({ isOpen: false, data: null });
        fetchUsers();
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 초기화
  const handleResetPassword = async (user: AdminUserAccount) => {
    setConfirmModal({
      isOpen: true,
      message: `${user.employee_name}님의 비밀번호를 초기화하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const response = await fetch(`/api/admin/admin-users/${user.id}/reset-password`, {
            method: 'POST',
          });
          const result = await response.json();
          if (result.success) {
            setAlertMessage('비밀번호가 초기화되었습니다.');
          } else {
            setAlertMessage(result.error?.message || '비밀번호 초기화 중 오류가 발생했습니다.');
          }
        } catch {
          setAlertMessage('비밀번호 초기화 중 오류가 발생했습니다.');
        }
      },
    });
  };

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">관리자 회원 조회</h1>
            <span className="text-[13px] text-[#888]">
              그리팅-X 관리 &gt; 계정 관리 &gt; 관리자 회원 조회
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
          <SearchField label="회사명">
            <input
              type="text"
              value={filters.company_name}
              onChange={(e) => setFilters({ ...filters, company_name: e.target.value })}
              className={`${inputClass} w-[150px]`}
              placeholder="회사명"
            />
          </SearchField>
          <SearchField label="부서명">
            <input
              type="text"
              value={filters.department_name}
              onChange={(e) => setFilters({ ...filters, department_name: e.target.value })}
              className={`${inputClass} w-[150px]`}
              placeholder="부서명"
            />
          </SearchField>
          <SearchField label="직원명">
            <input
              type="text"
              value={filters.employee_name}
              onChange={(e) => setFilters({ ...filters, employee_name: e.target.value })}
              className={`${inputClass} w-[150px]`}
              placeholder="직원명"
            />
          </SearchField>
          <SearchField label="ID">
            <input
              type="text"
              value={filters.login_id}
              onChange={(e) => setFilters({ ...filters, login_id: e.target.value })}
              className={`${inputClass} w-[150px]`}
              placeholder="로그인 ID"
            />
          </SearchField>
        </SearchFilterPanel>

        {/* 관리자 회원 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-black">관리자 회원 목록</h2>
            <Button 
              size="sm" 
              onClick={() => setUserModal({ isOpen: true, data: null })}
              className="h-[26px]"
            >
              <Plus className="w-3 h-3 mr-1" />
              추가
            </Button>
          </div>
          
          <div className="border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafafa] border-b">
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">ID</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">직원명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">부서명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">회사명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">핸드폰번호</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">회원상태</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">생성자</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경시간</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">변경자</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setUserModal({ isOpen: true, data: user })}
                      className="border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-[13px]">{maskId(user.login_id)}</td>
                      <td className="px-3 py-2 text-[13px]">{maskName(user.employee_name)}</td>
                      <td className="px-3 py-2 text-[13px]">{user.department_name || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">{user.company_name || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">{maskPhone(user.phone || '')}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{user.is_active ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{user.status === 'active' ? '활성' : '비활성'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(user.created_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{user.created_by || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDateTime(user.updated_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{user.updated_by || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetPassword(user);
                          }}
                          className="px-2 py-1 text-[12px] border border-gray-300 rounded hover:bg-gray-100"
                        >
                          PW 초기화
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 관리자 회원 모달 */}
      <AdminUserModal
        isOpen={userModal.isOpen}
        onClose={() => setUserModal({ isOpen: false, data: null })}
        onSave={handleSaveUser}
        initialData={userModal.data}
        companies={companies}
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

