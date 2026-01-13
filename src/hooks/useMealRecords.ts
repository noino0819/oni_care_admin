// ============================================
// 식사기록 관리 Hook
// ============================================

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

// 식사기록 현황 타입
export interface MealRecordSummary {
  user_id: string;
  email: string;
  name: string;
  member_type: string;
  business_code: string | null;
  record_count: number;
}

// 식사기록 세부 타입
export interface MealRecordDetail {
  id: string;
  meal_type: string;
  meal_type_display: string;
  menu_name: string;
  portion: string | null;
  calories: number | null;
  calories_display: string;
  meal_date: string;
  record_time: string;
  updated_at: string;
}

interface MealRecordSummaryResponse {
  success: boolean;
  data: MealRecordSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface MealRecordDetailResponse {
  success: boolean;
  data: MealRecordDetail[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface MealRecordFilters {
  name?: string;
  user_id?: string;
  member_types?: string[];
  business_code?: string;
  record_from?: string;
  record_to?: string;
  record_source?: string[];
}

// 식사기록 현황 조회 (회원별)
export function useMealRecords(
  filters: MealRecordFilters,
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
  if (filters.record_from) params.set('record_from', filters.record_from);
  if (filters.record_to) params.set('record_to', filters.record_to);
  if (filters.record_source && filters.record_source.length > 0) {
    params.set('record_source', filters.record_source.join(','));
  }
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const { data, error, isLoading, mutate } = useSWR<MealRecordSummaryResponse>(
    enabled ? `/admin/meal-records?${params.toString()}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    records: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 특정 회원의 식사기록 세부현황 조회
export function useMealRecordDetails(
  userId: string | null,
  recordFrom?: string,
  recordTo?: string,
  page: number = 1,
  pageSize: number = 20
) {
  const params = new URLSearchParams();
  if (recordFrom) params.set('record_from', recordFrom);
  if (recordTo) params.set('record_to', recordTo);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const { data, error, isLoading, mutate } = useSWR<MealRecordDetailResponse>(
    userId ? `/admin/meal-records/${userId}/details?${params.toString()}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    details: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

