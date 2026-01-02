// ============================================
// 포인트 관리 훅 - SWR 기반 데이터 페칭
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
import type {
  PointHistoryItem,
  PointSearchFilters,
  SortConfig,
  PaginationInfo,
} from '@/types';

// 인증 토큰을 포함한 fetcher
const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  
  return res.json();
};

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
    `/api/admin/points?${queryString}`,
    fetcher,
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
    id ? `/api/admin/points/${id}` : null,
    fetcher,
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/points/${id}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('포인트 취소에 실패했습니다.');
  }

  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/points'), undefined, { revalidate: true });
}

// 포인트 조정 함수
export async function adjustPoints(params: {
  user_id: string;
  points: number;
  reason: string;
  memo?: string;
}): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch('/api/admin/points/adjust', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('포인트 조정에 실패했습니다.');
  }

  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/points'), undefined, { revalidate: true });
}


