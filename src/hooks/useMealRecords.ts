// ============================================
// 식사기록 관리 Hook
// ============================================

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { swrFetcher, apiClient } from '@/lib/api-client';

// 식사기록 타입 (페이지에서 사용하는 형식)
export interface MealRecord {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  name: string;
  meal_id?: string;
  record_date: string;
  meal_date: string;
  meal_type: string;
  meal_type_display: string;
  food_name: string;
  menu_name: string;
  serving_size?: number;
  portion?: string;
  calories?: number;
  calories_display?: string;
  record_source: string;
  record_time: string;
  created_at: string;
  updated_at: string;
}

// 식사기록 현황 타입 (기존 형식 유지)
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

interface MealRecordListResponse {
  success: boolean;
  data: MealRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
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
  user_id?: string;
  user_name?: string;
  record_date_from?: string;
  record_date_to?: string;
  meal_type?: string;
  record_source?: string;
  page?: number;
  limit?: number;
}

// 식사기록 목록 조회 (전체 기록 리스트)
export function useMealRecords(filters: MealRecordFilters) {
  const params = new URLSearchParams();
  
  if (filters.user_id) params.set('user_id', filters.user_id);
  if (filters.user_name) params.set('name', filters.user_name);
  if (filters.record_date_from) params.set('record_from', filters.record_date_from);
  if (filters.record_date_to) params.set('record_to', filters.record_date_to);
  if (filters.meal_type) params.set('meal_type', filters.meal_type);
  if (filters.record_source) params.set('record_source', filters.record_source);
  params.set('page', String(filters.page || 1));
  params.set('page_size', String(filters.limit || 10));

  const { data, error, isLoading, mutate } = useSWR<MealRecordListResponse>(
    `/admin/meal-records/all?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // 데이터 변환
  const records = (data?.data || []).map(r => ({
    ...r,
    user_name: r.name || r.user_name,
    record_date: r.meal_date || r.record_date,
    food_name: r.menu_name || r.food_name,
    created_at: r.record_time || r.created_at,
  }));

  return {
    records,
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

// 식사기록 현황 조회 (회원별 - 대시보드용)
export function useMealRecordSummary(
  filters: {
    name?: string;
    user_id?: string;
    member_types?: string[];
    business_code?: string;
    record_from?: string;
    record_to?: string;
    record_source?: string[];
  },
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

// 식사기록 삭제
export function useDeleteMealRecord() {
  const { trigger, isMutating } = useSWRMutation(
    '/admin/meal-records',
    async (url: string, { arg }: { arg: string }) => {
      return await apiClient.delete(`${url}/${arg}`);
    }
  );

  return {
    deleteRecord: trigger,
    isDeleting: isMutating,
  };
}
