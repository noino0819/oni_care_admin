// ============================================
// 쿠폰 관리 Hook
// ============================================

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

// 쿠폰 타입
export interface Coupon {
  coupon_id: string;
  coupon_name: string;
  coupon_value: number;
  coupon_value_display: string;
  coupon_source: string;
  coupon_source_display: string;
  source_type: string;
  source_detail: string | null;
  status: string;
  expires_at: string | null;
  issued_at: string;
  user_id: string;
  email: string;
  name: string;
  member_type: string;
  member_type_display: string;
  business_code: string | null;
}

// 쿠폰 요약 타입
export interface CouponSummary {
  total_count: number;
  available_count: number;
  used_count: number;
  expired_count: number;
  total_value: number;
  greating_value: number;
  cafeteria_value: number;
}

interface CouponListResponse {
  success: boolean;
  data: Coupon[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CouponSummaryResponse {
  success: boolean;
  data: CouponSummary;
}

export interface CouponFilters {
  name?: string;
  user_id?: string;
  member_types?: string[];
  business_code?: string;
  issued_from?: string;
  issued_to?: string;
  coupon_source?: string[];
  coupon_value?: number;
}

// 쿠폰 현황 조회
export function useCoupons(
  filters: CouponFilters,
  page: number = 1,
  pageSize: number = 20,
  enabled: boolean = true
) {
  const params = new URLSearchParams();
  
  if (filters.name) params.set('name', filters.name);
  if (filters.user_id) params.set('user_id', filters.user_id);
  if (filters.member_types && filters.member_types.length > 0) {
    params.set('member_types', filters.member_types.join(','));
  }
  if (filters.business_code) params.set('business_code', filters.business_code);
  if (filters.issued_from) params.set('issued_from', filters.issued_from);
  if (filters.issued_to) params.set('issued_to', filters.issued_to);
  if (filters.coupon_source && filters.coupon_source.length > 0) {
    params.set('coupon_source', filters.coupon_source.join(','));
  }
  if (filters.coupon_value) params.set('coupon_value', String(filters.coupon_value));
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const { data, error, isLoading, mutate } = useSWR<CouponListResponse>(
    enabled ? `/admin/coupons?${params.toString()}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    coupons: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 쿠폰 발급 요약 (대시보드용)
export function useCouponSummary(
  issuedFrom?: string,
  issuedTo?: string
) {
  const params = new URLSearchParams();
  if (issuedFrom) params.set('issued_from', issuedFrom);
  if (issuedTo) params.set('issued_to', issuedTo);

  const { data, error, isLoading, mutate } = useSWR<CouponSummaryResponse>(
    `/admin/coupons/summary?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    summary: data?.data,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

