// ============================================
// 쿠폰 관리 Hook
// ============================================

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { swrFetcher, apiClient } from '@/lib/api-client';

// 쿠폰 타입 (페이지에서 사용하는 형식)
export interface Coupon {
  id: string;
  coupon_id: string;
  user_id: string;
  user_name: string;
  email: string;
  name: string;
  coupon_name: string;
  coupon_value: number;
  coupon_value_display: string;
  coupon_source: string;
  coupon_source_display: string;
  issue_source: string;
  source_type: string;
  source_detail: string | null;
  status: string;
  expires_at: string | null;
  issued_at: string;
  created_at: string;
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
  user_id?: string;
  user_name?: string;
  coupon_name?: string;
  issue_source?: string;
  issued_at_from?: string;
  issued_at_to?: string;
  page?: number;
  limit?: number;
}

// 쿠폰 목록 조회
export function useCoupons(filters: CouponFilters) {
  const params = new URLSearchParams();
  
  if (filters.user_id) params.set('user_id', filters.user_id);
  if (filters.user_name) params.set('name', filters.user_name); // API에서는 name 파라미터 사용
  if (filters.issue_source) params.set('coupon_source', filters.issue_source);
  if (filters.issued_at_from) params.set('issued_from', filters.issued_at_from);
  if (filters.issued_at_to) params.set('issued_to', filters.issued_at_to);
  params.set('page', String(filters.page || 1));
  params.set('page_size', String(filters.limit || 10));

  const { data, error, isLoading, mutate } = useSWR<CouponListResponse>(
    `/admin/coupons?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // 데이터 변환: API 응답을 페이지에서 사용하는 형식으로
  const coupons = (data?.data || []).map(c => ({
    ...c,
    id: c.coupon_id,
    user_name: c.name,
    issue_source: c.coupon_source,
  }));

  return {
    coupons,
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
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

// 쿠폰 삭제
export function useDeleteCoupon() {
  const { trigger, isMutating } = useSWRMutation(
    '/admin/coupons',
    async (url: string, { arg }: { arg: string }) => {
      return await apiClient.delete(`${url}/${arg}`);
    }
  );

  return {
    deleteCoupon: trigger,
    isDeleting: isMutating,
  };
}
