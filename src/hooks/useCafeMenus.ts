// ============================================
// 카페 메뉴 관리 훅 - SWR 기반 데이터 페칭
// ============================================

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import type { PaginationInfo } from '@/types';

// 카페 메뉴 타입
export interface CafeMenu {
  id: number;
  business_code: string;
  business_name: string;
  menu_name: string;
  menu_code: string;
  menu_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_new?: boolean;
}

// 검색 필터 타입
export interface CafeMenuSearchFilters {
  business_name?: string;
  business_code?: string;
  menu_code?: string;
  menu_price?: number | null;
  is_active?: string[];  // ['Y', 'N']
  created_from?: string;
  created_to?: string;
}

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: CafeMenuSearchFilters,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.business_name) params.append('business_name', filters.business_name);
  if (filters.business_code) params.append('business_code', filters.business_code);
  if (filters.menu_code) params.append('menu_code', filters.menu_code);
  if (filters.menu_price !== null && filters.menu_price !== undefined) {
    params.append('menu_price', String(filters.menu_price));
  }
  if (filters.is_active?.length) params.append('is_active', filters.is_active.join(','));
  if (filters.created_from) params.append('created_from', filters.created_from);
  if (filters.created_to) params.append('created_to', filters.created_to);
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface CafeMenuListResponse {
  success: boolean;
  data: CafeMenu[];
  pagination: PaginationInfo;
}

// 카페 메뉴 목록 조회 훅
export function useCafeMenus(
  filters: CafeMenuSearchFilters,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<CafeMenuListResponse>(
    `/admin/cafe-menus?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    menus: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

export default useCafeMenus;

