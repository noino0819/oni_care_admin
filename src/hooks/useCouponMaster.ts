// ============================================
// 쿠폰 마스터 관리 SWR Hook
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

// Fetcher
const swrFetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response;
};

// ============================================
// 타입 정의
// ============================================

export interface CouponMaster {
  id: number;
  coupon_code: string;
  coupon_name: string;
  coupon_type: string;
  coupon_type_display?: string;
  discount_value: number;
  discount_value_display?: string;
  discount_type: string;
  discount_type_display?: string;
  min_order_amount: number;
  max_discount_amount: number | null;
  valid_days: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponMasterCreate {
  coupon_code: string;
  coupon_name: string;
  coupon_type?: string;
  discount_value?: number;
  discount_type?: string;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  valid_days?: number;
  is_active?: boolean;
}

export interface CouponMasterUpdate {
  coupon_name?: string;
  coupon_type?: string;
  discount_value?: number;
  discount_type?: string;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  valid_days?: number;
  is_active?: boolean;
}

export interface CouponMasterFilters {
  coupon_code?: string;
  coupon_name?: string;
  coupon_type?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

interface CouponMasterListResponse {
  success: boolean;
  data: CouponMaster[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CouponMasterDetailResponse {
  success: boolean;
  data: CouponMaster;
}

// ============================================
// 쿠폰 마스터 목록 조회
// ============================================

export function useCouponMasters(filters: CouponMasterFilters) {
  const params = new URLSearchParams();
  
  if (filters.coupon_code) params.set('coupon_code', filters.coupon_code);
  if (filters.coupon_name) params.set('coupon_name', filters.coupon_name);
  if (filters.coupon_type) params.set('coupon_type', filters.coupon_type);
  if (filters.is_active) params.set('is_active', filters.is_active);
  params.set('page', String(filters.page || 1));
  params.set('page_size', String(filters.limit || 20));

  const { data, error, isLoading, mutate } = useSWR<CouponMasterListResponse>(
    `/api/v1/admin/coupon-master?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    couponMasters: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

// ============================================
// 쿠폰 마스터 상세 조회
// ============================================

export function useCouponMasterDetail(masterId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<CouponMasterDetailResponse>(
    masterId ? `/api/v1/admin/coupon-master/${masterId}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    couponMaster: data?.data,
    isLoading,
    error,
    mutate,
  };
}

// ============================================
// 쿠폰 마스터 생성
// ============================================

export function useCreateCouponMaster() {
  const [isCreating, setIsCreating] = useState(false);

  const createCouponMaster = async (data: CouponMasterCreate) => {
    setIsCreating(true);
    try {
      const result = await apiClient.post('/api/v1/admin/coupon-master', data);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/admin/coupon-master'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return { createCouponMaster, isCreating };
}

// ============================================
// 쿠폰 마스터 수정
// ============================================

export function useUpdateCouponMaster() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCouponMaster = async (masterId: number, data: CouponMasterUpdate) => {
    setIsUpdating(true);
    try {
      const result = await apiClient.put(`/api/v1/admin/coupon-master/${masterId}`, data);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/admin/coupon-master'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateCouponMaster, isUpdating };
}

// ============================================
// 쿠폰 마스터 삭제
// ============================================

export function useDeleteCouponMaster() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCouponMaster = async (masterId: number) => {
    setIsDeleting(true);
    try {
      const result = await apiClient.delete(`/api/v1/admin/coupon-master/${masterId}`);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/admin/coupon-master'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteCouponMaster, isDeleting };
}

// ============================================
// 쿠폰 마스터 일괄 삭제
// ============================================

export function useDeleteCouponMasters() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCouponMasters = async (ids: number[]) => {
    setIsDeleting(true);
    try {
      const result = await apiClient.delete(`/api/v1/admin/coupon-master?ids=${ids.join(',')}`);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/v1/admin/coupon-master'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteCouponMasters, isDeleting };
}

