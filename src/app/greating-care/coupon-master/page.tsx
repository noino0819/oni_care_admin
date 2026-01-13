'use client';

// ============================================
// 쿠폰 마스터 관리 페이지
// ============================================
// Admin DB의 coupon_master 테이블 관리
// 챌린지 보상용 쿠폰 템플릿 CRUD

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout';
import { DataTable, Pagination, AlertModal, ConfirmModal, Button } from '@/components/common';
import {
  useCouponMasters,
  useCreateCouponMaster,
  useUpdateCouponMaster,
  useDeleteCouponMaster,
  useDeleteCouponMasters,
  type CouponMaster,
  type CouponMasterCreate,
  type CouponMasterUpdate,
} from '@/hooks/useCouponMaster';
import type { TableColumn } from '@/types';

// 쿠폰 유형 옵션
const couponTypeOptions = [
  { value: 'discount', label: '할인' },
  { value: 'free_item', label: '무료 상품' },
];

// 할인 타입 옵션
const discountTypeOptions = [
  { value: 'fixed', label: '정액' },
  { value: 'percentage', label: '정률' },
];

export default function CouponMasterPage() {
  // ============================================
  // State
  // ============================================
  const [filters, setFilters] = useState({
    coupon_code: '',
    coupon_name: '',
    coupon_type: '',
    is_active: '',
    page: 1,
    limit: 20,
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CouponMaster | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: '',
  });

  // Form state
  const [formData, setFormData] = useState<CouponMasterCreate>({
    coupon_code: '',
    coupon_name: '',
    coupon_type: 'discount',
    discount_value: 0,
    discount_type: 'fixed',
    min_order_amount: 0,
    max_discount_amount: null,
    valid_days: 30,
    is_active: true,
  });

  // ============================================
  // Hooks
  // ============================================
  const { couponMasters, pagination, isLoading, mutate } = useCouponMasters(filters);
  const { createCouponMaster, isCreating } = useCreateCouponMaster();
  const { updateCouponMaster, isUpdating } = useUpdateCouponMaster();
  const { deleteCouponMaster, isDeleting } = useDeleteCouponMaster();
  const { deleteCouponMasters, isDeleting: isBulkDeleting } = useDeleteCouponMasters();

  // ============================================
  // Handlers
  // ============================================
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    setSelectedIds([]);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({
      coupon_code: '',
      coupon_name: '',
      coupon_type: '',
      is_active: '',
      page: 1,
      limit: 20,
    });
    setSelectedIds([]);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleSelect = useCallback((ids: number[]) => {
    setSelectedIds(ids);
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(couponMasters.map((item) => item.id));
      } else {
        setSelectedIds([]);
      }
    },
    [couponMasters]
  );

  // 생성
  const handleCreate = useCallback(() => {
    setFormData({
      coupon_code: '',
      coupon_name: '',
      coupon_type: 'discount',
      discount_value: 0,
      discount_type: 'fixed',
      min_order_amount: 0,
      max_discount_amount: null,
      valid_days: 30,
      is_active: true,
    });
    setShowCreateModal(true);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    if (!formData.coupon_code || !formData.coupon_name) {
      setAlertModal({
        show: true,
        title: '입력 오류',
        message: '쿠폰 코드와 쿠폰명은 필수 입력 항목입니다.',
      });
      return;
    }

    try {
      await createCouponMaster(formData);
      setShowCreateModal(false);
      mutate();
      setAlertModal({
        show: true,
        title: '성공',
        message: '쿠폰 마스터가 생성되었습니다.',
      });
    } catch {
      setAlertModal({
        show: true,
        title: '오류',
        message: '쿠폰 마스터 생성 중 오류가 발생했습니다.',
      });
    }
  }, [formData, createCouponMaster, mutate]);

  // 수정
  const handleEdit = useCallback((item: CouponMaster) => {
    setEditingItem(item);
    setFormData({
      coupon_code: item.coupon_code,
      coupon_name: item.coupon_name,
      coupon_type: item.coupon_type,
      discount_value: item.discount_value,
      discount_type: item.discount_type,
      min_order_amount: item.min_order_amount,
      max_discount_amount: item.max_discount_amount,
      valid_days: item.valid_days,
      is_active: item.is_active,
    });
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editingItem) return;

    const updateData: CouponMasterUpdate = {
      coupon_name: formData.coupon_name,
      coupon_type: formData.coupon_type,
      discount_value: formData.discount_value,
      discount_type: formData.discount_type,
      min_order_amount: formData.min_order_amount,
      max_discount_amount: formData.max_discount_amount,
      valid_days: formData.valid_days,
      is_active: formData.is_active,
    };

    try {
      await updateCouponMaster(editingItem.id, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      mutate();
      setAlertModal({
        show: true,
        title: '성공',
        message: '쿠폰 마스터가 수정되었습니다.',
      });
    } catch {
      setAlertModal({
        show: true,
        title: '오류',
        message: '쿠폰 마스터 수정 중 오류가 발생했습니다.',
      });
    }
  }, [editingItem, formData, updateCouponMaster, mutate]);

  // 삭제
  const handleDeleteClick = useCallback((id: number) => {
    setDeleteTarget(id);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) {
      try {
        await deleteCouponMaster(deleteTarget);
        mutate();
        setAlertModal({
          show: true,
          title: '성공',
          message: '쿠폰 마스터가 삭제되었습니다.',
        });
      } catch {
        setAlertModal({
          show: true,
          title: '오류',
          message: '쿠폰 마스터 삭제 중 오류가 발생했습니다.',
        });
      }
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteCouponMaster, mutate]);

  // 일괄 삭제
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) {
      setAlertModal({
        show: true,
        title: '알림',
        message: '삭제할 항목을 선택해주세요.',
      });
      return;
    }

    try {
      await deleteCouponMasters(selectedIds);
      setSelectedIds([]);
      mutate();
      setAlertModal({
        show: true,
        title: '성공',
        message: `${selectedIds.length}개의 쿠폰 마스터가 삭제되었습니다.`,
      });
    } catch {
      setAlertModal({
        show: true,
        title: '오류',
        message: '쿠폰 마스터 삭제 중 오류가 발생했습니다.',
      });
    }
  }, [selectedIds, deleteCouponMasters, mutate]);

  // ============================================
  // 테이블 컬럼 정의
  // ============================================
  const columns: TableColumn<CouponMaster>[] = [
    {
      key: 'checkbox',
      label: '',
      width: '50px',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds([...selectedIds, row.id]);
            } else {
              setSelectedIds(selectedIds.filter((id) => id !== row.id));
            }
          }}
          className="w-4 h-4"
        />
      ),
    },
    {
      key: 'id',
      label: 'No',
      width: '60px',
    },
    {
      key: 'coupon_code',
      label: '쿠폰 코드',
      width: '150px',
      render: (_, row) => <span className="font-mono text-sm">{row.coupon_code}</span>,
    },
    {
      key: 'coupon_name',
      label: '쿠폰명',
      width: '200px',
    },
    {
      key: 'coupon_type',
      label: '쿠폰 유형',
      width: '100px',
      render: (_, row) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.coupon_type === 'discount' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}
        >
          {row.coupon_type_display || row.coupon_type}
        </span>
      ),
    },
    {
      key: 'discount_value_display',
      label: '할인 금액/율',
      width: '120px',
    },
    {
      key: 'valid_days',
      label: '유효기간',
      width: '100px',
      render: (value) => `${value}일`,
    },
    {
      key: 'is_active',
      label: '사용여부',
      width: '100px',
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {value ? '사용' : '미사용'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: '생성일',
      width: '150px',
      render: (value) =>
        value ? new Date(value as string).toLocaleDateString('ko-KR') : '-',
    },
    {
      key: 'actions',
      label: '관리',
      width: '150px',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            수정
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      ),
    },
  ];

  // ============================================
  // Render
  // ============================================
  return (
    <AdminLayout
      title="쿠폰 마스터 관리"
      description="챌린지 보상용 쿠폰 템플릿을 관리합니다."
    >
      {/* 검색 필터 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 코드</label>
            <input
              type="text"
              value={filters.coupon_code}
              onChange={(e) => setFilters({ ...filters, coupon_code: e.target.value })}
              placeholder="쿠폰 코드 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰명</label>
            <input
              type="text"
              value={filters.coupon_name}
              onChange={(e) => setFilters({ ...filters, coupon_name: e.target.value })}
              placeholder="쿠폰명 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 유형</label>
            <select
              value={filters.coupon_type}
              onChange={(e) => setFilters({ ...filters, coupon_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {couponTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용여부</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button variant="secondary" onClick={handleReset}>
            초기화
          </Button>
          <Button variant="primary" onClick={handleSearch}>
            검색
          </Button>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          총 <span className="font-semibold text-blue-600">{pagination?.total || 0}</span>건
        </div>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleBulkDelete} disabled={selectedIds.length === 0 || isBulkDeleting}>
            선택 삭제 ({selectedIds.length})
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            쿠폰 마스터 등록
          </Button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow">
        <DataTable columns={columns} data={couponMasters} isLoading={isLoading} emptyMessage="등록된 쿠폰 마스터가 없습니다." />
      </div>

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">쿠폰 마스터 등록</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰 코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                  placeholder="예: CHALLENGE_REWARD_1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.coupon_name}
                  onChange={(e) => setFormData({ ...formData, coupon_name: e.target.value })}
                  placeholder="예: 챌린지 보상 1,000원 할인"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 유형</label>
                  <select
                    value={formData.coupon_type}
                    onChange={(e) => setFormData({ ...formData, coupon_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {couponTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">할인 타입</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {discountTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    할인 금액/율 {formData.discount_type === 'fixed' ? '(원)' : '(%)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (일)</label>
                  <input
                    type="number"
                    value={formData.valid_days}
                    onChange={(e) => setFormData({ ...formData, valid_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">최소 주문금액 (원)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">최대 할인금액 (원)</label>
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount_amount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="미입력 시 제한 없음"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  사용 여부
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                취소
              </Button>
              <Button variant="primary" onClick={handleCreateSubmit} disabled={isCreating}>
                {isCreating ? '등록 중...' : '등록'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">쿠폰 마스터 수정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 코드</label>
                <input
                  type="text"
                  value={formData.coupon_code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.coupon_name}
                  onChange={(e) => setFormData({ ...formData, coupon_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">쿠폰 유형</label>
                  <select
                    value={formData.coupon_type}
                    onChange={(e) => setFormData({ ...formData, coupon_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {couponTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">할인 타입</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {discountTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    할인 금액/율 {formData.discount_type === 'fixed' ? '(원)' : '(%)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유효기간 (일)</label>
                  <input
                    type="number"
                    value={formData.valid_days}
                    onChange={(e) => setFormData({ ...formData, valid_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">최소 주문금액 (원)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">최대 할인금액 (원)</label>
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount_amount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="미입력 시 제한 없음"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label htmlFor="edit_is_active" className="text-sm text-gray-700">
                  사용 여부
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
              >
                취소
              </Button>
              <Button variant="primary" onClick={handleEditSubmit} disabled={isUpdating}>
                {isUpdating ? '수정 중...' : '수정'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="쿠폰 마스터 삭제"
        message="선택한 쿠폰 마스터를 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      />

      {/* 알림 모달 */}
      <AlertModal
        isOpen={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ show: false, title: '', message: '' })}
      />
    </AdminLayout>
  );
}

