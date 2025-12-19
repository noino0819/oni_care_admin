'use client';

// ============================================
// 회사관리 페이지 - 기획서 디자인 참고 (2패널 구성)
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
import type { Company, Department, CompanySearchFilters } from '@/types';

export default function CompaniesPage() {
  // 필터 상태
  const [filters, setFilters] = useState<CompanySearchFilters>({
    company_code: '',
    company_name: '',
    department_code: '',
    department_name: '',
  });

  // 회사 상태
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [editingCompanies, setEditingCompanies] = useState<Record<number, Partial<Company>>>({});
  const [newCompany, setNewCompany] = useState<Partial<Company> | null>(null);

  // 부서 상태
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [editingDepts, setEditingDepts] = useState<Record<number, Partial<Department>>>({});
  const [newDepartment, setNewDepartment] = useState<Partial<Department> | null>(null);

  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 변경 추적
  const [hasChanges, setHasChanges] = useState(false);

  // 회사 조회
  const fetchCompanies = useCallback(async () => {
    setIsCompanyLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_code) params.set('company_code', filters.company_code);
      if (filters.company_name) params.set('company_name', filters.company_name);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/companies?${params}`);
      const result = await response.json();

      if (result.success) {
        setCompanies(result.data || []);
        setEditingCompanies({});
        setNewCompany(null);
      }
    } catch {
      setAlertMessage('회사 조회 중 오류가 발생했습니다.');
    } finally {
      setIsCompanyLoading(false);
    }
  }, [filters.company_code, filters.company_name]);

  // 부서 조회
  const fetchDepartments = useCallback(async () => {
    if (!selectedCompanyId) {
      setDepartments([]);
      return;
    }

    setIsDeptLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department_code) params.set('department_code', filters.department_code);
      if (filters.department_name) params.set('department_name', filters.department_name);

      const response = await fetch(`/api/admin/companies/${selectedCompanyId}/departments?${params}`);
      const result = await response.json();

      if (result.success) {
        setDepartments(result.data || []);
        setEditingDepts({});
        setNewDepartment(null);
      }
    } catch {
      setAlertMessage('부서 조회 중 오류가 발생했습니다.');
    } finally {
      setIsDeptLoading(false);
    }
  }, [selectedCompanyId, filters.department_code, filters.department_name]);

  // 초기 로드
  useEffect(() => {
    fetchCompanies();
  }, []);

  // 회사 선택 시 부서 조회
  useEffect(() => {
    fetchDepartments();
  }, [selectedCompanyId, fetchDepartments]);

  // 조회 버튼 클릭
  const handleSearch = () => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: '저장하지 않은 변경사항이 있습니다.\n계속하시겠습니까?',
        onConfirm: () => {
          setHasChanges(false);
          setConfirmModal(null);
          fetchCompanies();
          setSelectedCompanyId(null);
        },
      });
    } else {
      fetchCompanies();
      setSelectedCompanyId(null);
    }
  };

  // 초기화 버튼 클릭
  const handleRefresh = () => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: '저장하지 않은 변경사항이 있습니다.\n계속하시겠습니까?',
        onConfirm: () => {
          setHasChanges(false);
          setConfirmModal(null);
          setFilters({
            company_code: '',
            company_name: '',
            department_code: '',
            department_name: '',
          });
          setSelectedCompanyId(null);
          setDepartments([]);
          fetchCompanies();
        },
      });
    } else {
      setFilters({
        company_code: '',
        company_name: '',
        department_code: '',
        department_name: '',
      });
      setSelectedCompanyId(null);
      setDepartments([]);
      fetchCompanies();
    }
  };

  // 회사 추가 버튼
  const handleAddCompany = () => {
    setNewCompany({
      company_code: '',
      company_name: '',
      note: '',
      is_active: true,
    });
    setHasChanges(true);
  };

  // 회사 저장
  const handleSaveCompanies = async () => {
    try {
      // 새 회사 저장
      if (newCompany) {
        if (!newCompany.company_code || !newCompany.company_name) {
          setAlertMessage('회사코드와 회사명은 필수입니다.');
          return;
        }

        const response = await fetch('/api/admin/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCompany),
        });

        const result = await response.json();
        if (!result.success) {
          setAlertMessage(result.error?.message || '회사 추가 중 오류가 발생했습니다.');
          return;
        }
      }

      // 수정된 회사 저장
      for (const [id, changes] of Object.entries(editingCompanies)) {
        const company = companies.find(c => c.id === parseInt(id));
        if (!company) continue;

        const updatedCompany = { ...company, ...changes };
        
        const response = await fetch(`/api/admin/companies/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedCompany),
        });

        const result = await response.json();
        if (!result.success) {
          setAlertMessage(result.error?.message || '회사 수정 중 오류가 발생했습니다.');
          return;
        }
      }

      setAlertMessage('저장되었습니다.');
      setHasChanges(false);
      fetchCompanies();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 부서 추가 버튼
  const handleAddDepartment = () => {
    if (!selectedCompanyId) {
      setAlertMessage('회사를 먼저 선택해주세요.');
      return;
    }
    setNewDepartment({
      company_id: selectedCompanyId,
      department_code: '',
      department_name: '',
      note: '',
      is_active: true,
    });
    setHasChanges(true);
  };

  // 부서 저장
  const handleSaveDepartments = async () => {
    if (!selectedCompanyId) return;

    try {
      // 새 부서 저장
      if (newDepartment) {
        if (!newDepartment.department_code || !newDepartment.department_name) {
          setAlertMessage('부서코드와 부서명은 필수입니다.');
          return;
        }

        const response = await fetch(`/api/admin/companies/${selectedCompanyId}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDepartment),
        });

        const result = await response.json();
        if (!result.success) {
          setAlertMessage(result.error?.message || '부서 추가 중 오류가 발생했습니다.');
          return;
        }
      }

      // 수정된 부서 저장
      for (const [id, changes] of Object.entries(editingDepts)) {
        const dept = departments.find(d => d.id === parseInt(id));
        if (!dept) continue;

        const updatedDept = { ...dept, ...changes };
        
        const response = await fetch(`/api/admin/departments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDept),
        });

        const result = await response.json();
        if (!result.success) {
          setAlertMessage(result.error?.message || '부서 수정 중 오류가 발생했습니다.');
          return;
        }
      }

      setAlertMessage('저장되었습니다.');
      setHasChanges(false);
      fetchDepartments();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 회사 필드 변경
  const handleCompanyChange = (id: number, field: keyof Company, value: unknown) => {
    setEditingCompanies(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // 부서 필드 변경
  const handleDeptChange = (id: number, field: keyof Department, value: unknown) => {
    setEditingDepts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const cellInputClass = "w-full h-[28px] px-2 border border-gray-200 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]";

  // 회사 데이터 (수정 중 포함)
  const getCompanyValue = (company: Company, field: keyof Company) => {
    return editingCompanies[company.id]?.[field] ?? company[field];
  };

  // 부서 데이터 (수정 중 포함)
  const getDeptValue = (dept: Department, field: keyof Department) => {
    return editingDepts[dept.id]?.[field] ?? dept[field];
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">회사관리</h1>
            <span className="text-[13px] text-[#888]">
              설정 &gt; 기초정보 관리 &gt; 회사 및 조직 관리
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
          <SearchField label="회사코드">
            <input
              type="text"
              value={filters.company_code}
              onChange={(e) => setFilters({ ...filters, company_code: e.target.value })}
              className={`${inputClass} w-[150px]`}
            />
          </SearchField>
          <SearchField label="회사명">
            <input
              type="text"
              value={filters.company_name}
              onChange={(e) => setFilters({ ...filters, company_name: e.target.value })}
              className={`${inputClass} w-[150px]`}
            />
          </SearchField>
          <SearchField label="조직코드">
            <input
              type="text"
              value={filters.department_code}
              onChange={(e) => setFilters({ ...filters, department_code: e.target.value })}
              className={`${inputClass} w-[150px]`}
            />
          </SearchField>
          <SearchField label="조직명">
            <input
              type="text"
              value={filters.department_name}
              onChange={(e) => setFilters({ ...filters, department_name: e.target.value })}
              className={`${inputClass} w-[150px]`}
            />
          </SearchField>
        </SearchFilterPanel>

        {/* 회사관리 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-[16px] font-bold text-black mb-6">회사관리</h2>
          
          <div className="flex gap-4">
            {/* 좌측 패널: 회사 */}
            <div className="w-[45%] flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold">▶ 회사</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCompany} className="h-[26px] px-2">
                    <Plus className="w-3 h-3 mr-1" />
                  </Button>
                  <Button size="sm" onClick={handleSaveCompanies} className="h-[26px]">
                    저장
                  </Button>
                </div>
              </div>
              <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">회사코드</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">회사명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">비고</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCompanyLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : (
                      <>
                        {newCompany && (
                          <tr className="border-b bg-blue-50">
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newCompany.company_code || ''}
                                onChange={(e) => setNewCompany({ ...newCompany, company_code: e.target.value })}
                                className={cellInputClass}
                                placeholder="회사코드"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newCompany.company_name || ''}
                                onChange={(e) => setNewCompany({ ...newCompany, company_name: e.target.value })}
                                className={cellInputClass}
                                placeholder="회사명"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newCompany.note || ''}
                                onChange={(e) => setNewCompany({ ...newCompany, note: e.target.value })}
                                className={cellInputClass}
                                placeholder="-"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <select
                                value={newCompany.is_active ? 'Y' : 'N'}
                                onChange={(e) => setNewCompany({ ...newCompany, is_active: e.target.value === 'Y' })}
                                className={`${cellInputClass} w-[50px]`}
                              >
                                <option value="Y">Y</option>
                                <option value="N">N</option>
                              </select>
                            </td>
                          </tr>
                        )}
                        {companies.length === 0 && !newCompany ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-400">
                              데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          companies.map((company) => (
                            <tr
                              key={company.id}
                              onClick={() => setSelectedCompanyId(company.id)}
                              className={`border-b last:border-0 cursor-pointer transition-colors ${
                                selectedCompanyId === company.id
                                  ? 'bg-[#fff8dc]'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={getCompanyValue(company, 'company_code') as string}
                                  onChange={(e) => handleCompanyChange(company.id, 'company_code', e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={getCompanyValue(company, 'company_name') as string}
                                  onChange={(e) => handleCompanyChange(company.id, 'company_name', e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={(getCompanyValue(company, 'note') as string) || '-'}
                                  onChange={(e) => handleCompanyChange(company.id, 'note', e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <select
                                  value={getCompanyValue(company, 'is_active') ? 'Y' : 'N'}
                                  onChange={(e) => handleCompanyChange(company.id, 'is_active', e.target.value === 'Y')}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`${cellInputClass} w-[50px]`}
                                >
                                  <option value="Y">Y</option>
                                  <option value="N">N</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측 패널: 조직 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold">▶ 조직</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddDepartment} className="h-[26px] px-2">
                    <Plus className="w-3 h-3 mr-1" />
                  </Button>
                  <Button size="sm" onClick={handleSaveDepartments} className="h-[26px]">
                    저장
                  </Button>
                </div>
              </div>
              <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#fafafa] border-b">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">회사코드</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">부서명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">부서코드</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">비고</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center">사용여부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isDeptLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : !selectedCompanyId ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          회사를 선택해주세요.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {newDepartment && (
                          <tr className="border-b bg-blue-50">
                            <td className="px-2 py-1 text-[13px]">
                              {companies.find(c => c.id === selectedCompanyId)?.company_code || '-'}
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newDepartment.department_name || ''}
                                onChange={(e) => setNewDepartment({ ...newDepartment, department_name: e.target.value })}
                                className={cellInputClass}
                                placeholder="부서명"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newDepartment.department_code || ''}
                                onChange={(e) => setNewDepartment({ ...newDepartment, department_code: e.target.value })}
                                className={cellInputClass}
                                placeholder="부서코드"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={newDepartment.note || ''}
                                onChange={(e) => setNewDepartment({ ...newDepartment, note: e.target.value })}
                                className={cellInputClass}
                                placeholder="-"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <select
                                value={newDepartment.is_active ? 'Y' : 'N'}
                                onChange={(e) => setNewDepartment({ ...newDepartment, is_active: e.target.value === 'Y' })}
                                className={`${cellInputClass} w-[50px]`}
                              >
                                <option value="Y">Y</option>
                                <option value="N">N</option>
                              </select>
                            </td>
                          </tr>
                        )}
                        {departments.length === 0 && !newDepartment ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-gray-400">
                              데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          departments.map((dept) => (
                            <tr
                              key={dept.id}
                              className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-2 py-1 text-[13px]">
                                {companies.find(c => c.id === dept.company_id)?.company_code || '-'}
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={getDeptValue(dept, 'department_name') as string}
                                  onChange={(e) => handleDeptChange(dept.id, 'department_name', e.target.value)}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={getDeptValue(dept, 'department_code') as string}
                                  onChange={(e) => handleDeptChange(dept.id, 'department_code', e.target.value)}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={(getDeptValue(dept, 'note') as string) || '-'}
                                  onChange={(e) => handleDeptChange(dept.id, 'note', e.target.value)}
                                  className={cellInputClass}
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <select
                                  value={getDeptValue(dept, 'is_active') ? 'Y' : 'N'}
                                  onChange={(e) => handleDeptChange(dept.id, 'is_active', e.target.value === 'Y')}
                                  className={`${cellInputClass} w-[50px]`}
                                >
                                  <option value="Y">Y</option>
                                  <option value="N">N</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          confirmText="나가기"
          cancelText="취소"
        />
      )}
    </AdminLayout>
  );
}

