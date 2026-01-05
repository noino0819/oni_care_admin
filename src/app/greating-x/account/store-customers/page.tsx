'use client';

// ============================================
// 지점별 고객 조회 페이지
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
import { RefreshCw, Plus, Calendar } from 'lucide-react';
import type { StoreCustomer, SecurityGroup } from '@/types';

// 고객 회원 모달 컴포넌트
interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<StoreCustomer>) => void;
  initialData?: StoreCustomer | null;
  stores: SecurityGroup[];
  isLoading?: boolean;
}

function CustomerModal({ isOpen, onClose, onSave, initialData, stores, isLoading }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    member_code: '',
    customer_name: '',
    first_store_id: null as string | null,
    authorized_stores: [] as string[],
    phone: '',
    push_agreed: false,
    sms_agreed: false,
    registered_at: '',
    joined_at: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        member_code: initialData.member_code || '',
        customer_name: initialData.customer_name || '',
        first_store_id: initialData.first_store_id || null,
        authorized_stores: initialData.authorized_stores || [],
        phone: initialData.phone || '',
        push_agreed: initialData.push_agreed ?? false,
        sms_agreed: initialData.sms_agreed ?? false,
        registered_at: initialData.registered_at || '',
        joined_at: initialData.joined_at || '',
      });
    } else {
      setFormData({
        member_code: '',
        customer_name: '',
        first_store_id: null,
        authorized_stores: [],
        phone: '',
        push_agreed: false,
        sms_agreed: false,
        registered_at: '',
        joined_at: '',
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
          {/* 1행: 회원코드, 고객명 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                회원코드
              </div>
              <input
                type="text"
                value={formData.member_code}
                disabled
                className="flex-1 px-3 py-2 text-[14px] bg-gray-100 focus:outline-none"
                placeholder="자동생성"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                고객명
              </div>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="고객명"
              />
            </div>
          </div>

          {/* 2행: 최초등록지점, 권한지점 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                최초등록지점
              </div>
              <input
                type="text"
                value={stores.find(s => s.id === formData.first_store_id)?.group_name || ''}
                disabled
                className="flex-1 px-3 py-2 text-[14px] bg-gray-100 focus:outline-none"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                권한지점
              </div>
              <select
                value={formData.authorized_stores[0] || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  authorized_stores: e.target.value ? [e.target.value] : [],
                  first_store_id: !formData.first_store_id ? e.target.value : formData.first_store_id
                })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              >
                <option value="">선택해주세요</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.group_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3행: 핸드폰 번호, 수신여부 */}
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
                수신여부
              </div>
              <div className="flex-1 px-3 py-2 flex items-center gap-4">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.push_agreed || formData.sms_agreed}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      push_agreed: e.target.checked,
                      sms_agreed: e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-[14px]">Y</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.push_agreed && !formData.sms_agreed}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      push_agreed: !e.target.checked,
                      sms_agreed: !e.target.checked 
                    })}
                    className="w-4 h-4"
                  />
                  <span className="text-[14px]">N</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4행: 최초등록일, 가입일 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                최초등록일
              </div>
              <div className="flex-1 flex items-center px-2">
                <input
                  type="date"
                  value={formData.registered_at}
                  onChange={(e) => setFormData({ ...formData, registered_at: e.target.value })}
                  className="flex-1 px-1 py-2 text-[14px] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                가입일
              </div>
              <div className="flex-1 flex items-center px-2">
                <input
                  type="date"
                  value={formData.joined_at}
                  onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                  className="flex-1 px-1 py-2 text-[14px] focus:outline-none"
                />
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
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\./g, '.').replace(/ /g, '');
}

// 날짜 퀵버튼 함수
function getDateRange(period: string): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().split('T')[0];
  let from = new Date();

  switch (period) {
    case '1week':
      from.setDate(today.getDate() - 7);
      break;
    case '1month':
      from.setMonth(today.getMonth() - 1);
      break;
    case '2month':
      from.setMonth(today.getMonth() - 2);
      break;
    case '3month':
      from.setMonth(today.getMonth() - 3);
      break;
    default:
      return { from: '', to: '' };
  }

  return { from: from.toISOString().split('T')[0], to };
}

export default function StoreCustomersPage() {
  // 필터 상태
  const [filters, setFilters] = useState({
    store_id: '',
    customer_name: '',
    member_code: '',
    receive_agreed: '',
    last_visit_from: '',
    last_visit_to: '',
    registered_from: '',
    registered_to: '',
  });

  // 지점 목록 (보안그룹)
  const [stores, setStores] = useState<SecurityGroup[]>([]);

  // 고객 상태
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [customerModal, setCustomerModal] = useState<{
    isOpen: boolean;
    data: StoreCustomer | null;
  }>({ isOpen: false, data: null });
  const [isSaving, setIsSaving] = useState(false);

  // 지점 목록 조회
  const fetchStores = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/security-groups?limit=100');
      const result = await response.json();
      if (result.success) {
        setStores(result.data || []);
      }
    } catch {
      console.error('지점 조회 실패');
    }
  }, []);

  // 고객 조회
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.store_id) params.set('store_id', filters.store_id);
      if (filters.customer_name) params.set('customer_name', filters.customer_name);
      if (filters.member_code) params.set('member_code', filters.member_code);
      if (filters.receive_agreed) params.set('receive_agreed', filters.receive_agreed);
      if (filters.last_visit_from) params.set('last_visit_from', filters.last_visit_from);
      if (filters.last_visit_to) params.set('last_visit_to', filters.last_visit_to);
      if (filters.registered_from) params.set('registered_from', filters.registered_from);
      if (filters.registered_to) params.set('registered_to', filters.registered_to);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/store-customers?${params}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch {
      setAlertMessage('고객 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // 초기 로드
  useEffect(() => {
    fetchStores();
    fetchCustomers();
  }, []);

  // 조회 버튼
  const handleSearch = () => {
    fetchCustomers();
  };

  // 초기화 버튼
  const handleRefresh = () => {
    setFilters({
      store_id: '',
      customer_name: '',
      member_code: '',
      receive_agreed: '',
      last_visit_from: '',
      last_visit_to: '',
      registered_from: '',
      registered_to: '',
    });
    fetchCustomers();
  };

  // 고객 저장
  const handleSaveCustomer = async (data: Partial<StoreCustomer>) => {
    if (!data.customer_name) {
      setAlertMessage('고객명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!customerModal.data;
      const url = isEdit 
        ? `/api/admin/store-customers/${customerModal.data!.id}`
        : '/api/admin/store-customers';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setAlertMessage(isEdit ? '수정되었습니다.' : '추가되었습니다.');
        setCustomerModal({ isOpen: false, data: null });
        fetchCustomers();
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
  const quickBtnClass = "px-2 py-1 text-[11px] bg-gray-600 text-white rounded hover:bg-gray-700";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">지점별 고객 조회</h1>
            <span className="text-[13px] text-[#888]">
              그리팅-X 관리 &gt; 계정 관리 &gt; 고객 조회,수정,삭제
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 1행 */}
            <SearchField label="지점">
              <select
                value={filters.store_id}
                onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
                className={`${inputClass} w-[150px]`}
              >
                <option value="">전체</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.group_name}
                  </option>
                ))}
              </select>
            </SearchField>
            <SearchField label="고객명">
              <input
                type="text"
                value={filters.customer_name}
                onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
                className={`${inputClass} w-[150px]`}
                placeholder="고객명"
              />
            </SearchField>
            <SearchField label="회원코드">
              <input
                type="text"
                value={filters.member_code}
                onChange={(e) => setFilters({ ...filters, member_code: e.target.value })}
                className={`${inputClass} w-[150px]`}
                placeholder="회원코드"
              />
            </SearchField>
            <SearchField label="수신여부">
              <select
                value={filters.receive_agreed}
                onChange={(e) => setFilters({ ...filters, receive_agreed: e.target.value })}
                className={`${inputClass} w-[100px]`}
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </SearchField>
          </div>
          
          {/* 2행 - 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <SearchField label="최근 방문일">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.last_visit_from}
                  onChange={(e) => setFilters({ ...filters, last_visit_from: e.target.value })}
                  className={`${inputClass} w-[130px]`}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={filters.last_visit_to}
                  onChange={(e) => setFilters({ ...filters, last_visit_to: e.target.value })}
                  className={`${inputClass} w-[130px]`}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('1week');
                      setFilters({ ...filters, last_visit_from: from, last_visit_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    1주일
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('1month');
                      setFilters({ ...filters, last_visit_from: from, last_visit_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    1개월
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('2month');
                      setFilters({ ...filters, last_visit_from: from, last_visit_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    2개월
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('3month');
                      setFilters({ ...filters, last_visit_from: from, last_visit_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    3개월
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, last_visit_from: '', last_visit_to: '' })}
                    className="px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-100"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </SearchField>
            
            <SearchField label="등록일">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.registered_from}
                  onChange={(e) => setFilters({ ...filters, registered_from: e.target.value })}
                  className={`${inputClass} w-[130px]`}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={filters.registered_to}
                  onChange={(e) => setFilters({ ...filters, registered_to: e.target.value })}
                  className={`${inputClass} w-[130px]`}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('1week');
                      setFilters({ ...filters, registered_from: from, registered_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    1주일
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('1month');
                      setFilters({ ...filters, registered_from: from, registered_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    1개월
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('2month');
                      setFilters({ ...filters, registered_from: from, registered_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    2개월
                  </button>
                  <button
                    onClick={() => {
                      const { from, to } = getDateRange('3month');
                      setFilters({ ...filters, registered_from: from, registered_to: to });
                    }}
                    className={quickBtnClass}
                  >
                    3개월
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, registered_from: '', registered_to: '' })}
                    className="px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-100"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </SearchField>
          </div>
        </div>

        {/* 회원 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-black">회원 목록</h2>
            <Button 
              size="sm" 
              onClick={() => setCustomerModal({ isOpen: true, data: null })}
              className="h-[26px]"
            >
              <Plus className="w-3 h-3 mr-1" />
              추가
            </Button>
          </div>
          
          <div className="border rounded overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-[#fafafa] border-b">
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">회원코드</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">고객명</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">휴대폰번호</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">최초등록지점</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">권한지점</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">등록일</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-left">최근방문일</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">푸시 수신</th>
                  <th className="px-3 py-2 text-[13px] font-semibold text-center">SMS 수신</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-[13px] text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => setCustomerModal({ isOpen: true, data: customer })}
                      className="border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-[13px]">{customer.member_code}</td>
                      <td className="px-3 py-2 text-[13px]">{maskName(customer.customer_name)}</td>
                      <td className="px-3 py-2 text-[13px]">{maskPhone(customer.phone || '')}</td>
                      <td className="px-3 py-2 text-[13px]">{customer.first_store_name || '-'}</td>
                      <td className="px-3 py-2 text-[13px]">
                        {customer.authorized_store_names?.join(', ') || 
                         stores.filter(s => customer.authorized_stores?.includes(s.id))
                               .map(s => s.group_name).join(', ') || '-'}
                      </td>
                      <td className="px-3 py-2 text-[13px]">{formatDate(customer.registered_at)}</td>
                      <td className="px-3 py-2 text-[13px]">{formatDate(customer.last_visit_at)}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{customer.push_agreed ? 'Y' : 'N'}</td>
                      <td className="px-3 py-2 text-[13px] text-center">{customer.sms_agreed ? 'Y' : 'N'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 고객 회원 모달 */}
      <CustomerModal
        isOpen={customerModal.isOpen}
        onClose={() => setCustomerModal({ isOpen: false, data: null })}
        onSave={handleSaveCustomer}
        initialData={customerModal.data}
        stores={stores}
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





