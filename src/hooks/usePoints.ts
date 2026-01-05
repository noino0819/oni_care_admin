// ============================================
// 포인트 관리 훅 - SWR 기반 데이터 페칭
// ============================================
// FastAPI 백엔드 연동

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';
import type {
  PointHistoryItem,
  PointSearchFilters,
  SortConfig,
  PaginationInfo,
} from '@/types';

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: PointSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.name) params.append('name', filters.name);
  if (filters.id) params.append('id', filters.id);
  if (filters.member_types?.length) params.append('member_types', filters.member_types.join(','));
  if (filters.business_code) params.append('business_code', filters.business_code);
  if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
  if (filters.created_from) params.append('created_from', filters.created_from);
  if (filters.created_to) params.append('created_to', filters.created_to);
  
  if (sort.field) {
    params.append('sort_field', sort.field);
    params.append('sort_direction', sort.direction || 'asc');
  }
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface PointHistoryResponse {
  success: boolean;
  data: PointHistoryItem[];
  pagination: PaginationInfo;
}

interface PointDetailResponse {
  success: boolean;
  data: PointHistoryItem;
}

// 포인트 내역 조회 훅
export function usePoints(
  filters: PointSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, sort, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<PointHistoryResponse>(
    `/admin/points?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    pointHistory: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 포인트 상세 조회 훅
export function usePointDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PointDetailResponse>(
    id ? `/admin/points/${id}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    point: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 포인트 거래 취소 함수
export async function revokePointTransaction(id: string): Promise<void> {
  await apiClient.post(`/admin/points/${id}/revoke`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/points'), undefined, { revalidate: true });
}

// 포인트 조정 함수
export async function adjustPoints(params: {
  user_id: string;
  points: number;
  reason: string;
  memo?: string;
}): Promise<void> {
  await apiClient.post('/admin/points/adjust', params);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/points'), undefined, { revalidate: true });
}
