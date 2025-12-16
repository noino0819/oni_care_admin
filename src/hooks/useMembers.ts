'use client';

// ============================================
// 회원 데이터 훅
// ============================================

import useSWR from 'swr';
import type { MemberListItem, MemberDetail, MemberSearchFilters, SortConfig } from '@/types';

interface MembersResponse {
  success: boolean;
  data: MemberListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MemberDetailResponse {
  success: boolean;
  data: MemberDetail;
}

// SWR fetcher
const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('API 요청 실패');
  }

  return response.json();
};

// 필터를 쿼리 문자열로 변환
function filtersToQuery(filters: MemberSearchFilters, sort?: SortConfig, page = 1, limit = 20): string {
  const params = new URLSearchParams();
  
  params.set('page', String(page));
  params.set('limit', String(limit));

  if (filters.name) params.set('name', filters.name);
  if (filters.id) params.set('id', filters.id);
  if (filters.birth_year) params.set('birth_year', filters.birth_year);
  if (filters.birth_month) params.set('birth_month', filters.birth_month);
  if (filters.birth_day) params.set('birth_day', filters.birth_day);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.member_types?.length) params.set('member_types', filters.member_types.join(','));
  if (filters.phone) params.set('phone', filters.phone);
  if (filters.business_code) params.set('business_code', filters.business_code);
  if (filters.created_from) params.set('created_from', filters.created_from);
  if (filters.created_to) params.set('created_to', filters.created_to);

  if (sort?.field) {
    params.set('sort_field', sort.field);
    params.set('sort_direction', sort.direction || 'desc');
  }

  return params.toString();
}

// 회원 목록 조회 훅
export function useMembers(
  filters: MemberSearchFilters,
  sort?: SortConfig,
  page = 1,
  limit = 20,
  enabled = true
) {
  const queryString = filtersToQuery(filters, sort, page, limit);
  const hasFilters = Object.values(filters).some((v) => 
    v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  );

  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    enabled && hasFilters ? `/api/members?${queryString}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    members: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 회원 상세 조회 훅
export function useMemberDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MemberDetailResponse>(
    id ? `/api/members/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    member: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

